const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const os = require('os');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
       contextIsolation: true,  // must be true
      nodeIntegration: false,  // must be false
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  return { filePath, content };
});

ipcMain.handle('fs:saveFile', async (_evt, { filePath, content }) => {
  try {
    if (!filePath) {
      const result = await dialog.showSaveDialog({});
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return { filePath };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const children = entries.map((e) => ({
    name: e.name,
    path: path.join(folderPath, e.name),
    isDir: e.isDirectory(),
  }));
  return { folderPath, children };
});

ipcMain.handle('fs:readDir', async (_evt, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isDir: e.isDirectory(),
    }));
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('fs:readFile', async (_evt, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { filePath, content };
  } catch (err) {
    return { error: String(err) };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Simple AI chat via OpenAI if key is present; otherwise echo mock
ipcMain.handle('ai:chat', async (_evt, payload) => {
  const { messages, provider, model } = payload || {};
  const chosenProvider = provider || 'auto';

  async function chatOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const body = JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature: 0.2 });
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    try {
      const json = JSON.parse(response);
      const content = json?.choices?.[0]?.message?.content || '';
      return { role: 'assistant', content };
    } catch (e) {
      return { role: 'assistant', content: 'Error parsing AI response.' };
    }
  }

  async function chatOllama() {
    const body = JSON.stringify({ model: model || 'llama3.1', messages, stream: false });
    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 11434,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    try {
      const json = JSON.parse(response);
      const content = json?.message?.content || '';
      return { role: 'assistant', content };
    } catch (e) {
      return { role: 'assistant', content: 'Error parsing Ollama response.' };
    }
  }

  try {
    if (chosenProvider === 'openai') {
      const r = await chatOpenAI();
      if (r) return r;
    } else if (chosenProvider === 'ollama') {
      return await chatOllama();
    } else {
      // auto: prefer OpenAI if key present, else Ollama
      const r = await chatOpenAI();
      if (r) return r;
      return await chatOllama();
    }
  } catch (e) {
    // fallthrough to mock
  }

  const last = messages?.[messages.length - 1]?.content || '';
  const suggestion = `// Suggested change based on: ${last}\nconsole.log('Applied suggestion');`;
  return { role: 'assistant', content: `Here is a suggestion.\n\n${suggestion}`, proposed: suggestion };
});

// --- Analysis helpers ---
function isTextFile(fileName) {
  const textExts = [
    'ts','tsx','js','jsx','cjs','mjs','json','md','txt','css','scss','html','yml','yaml','py','go','rs','java','kt','c','cpp','h','hpp','cs','sh','bat','ps1'
  ];
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return textExts.includes(ext);
}

function walkDir(dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules and dist/build
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name.startsWith('.')) continue;
      walkDir(full, results);
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

ipcMain.handle('analyze:scan', async (_evt, folderPath) => {
  try {
    const files = walkDir(folderPath).filter((f) => isTextFile(f));
    const stats = files.map((f) => ({ path: f, size: fs.statSync(f).size }));
    return { folderPath, files: stats };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('analyze:collectText', async (_evt, { folderPath, maxBytesPerFile = 200_000 }) => {
  try {
    const files = walkDir(folderPath).filter((f) => isTextFile(f));
    const parts = [];
    for (const f of files) {
      try {
        const buf = fs.readFileSync(f);
        const slice = buf.slice(0, Math.min(buf.length, maxBytesPerFile)).toString('utf8');
        parts.push(`\n\n===== FILE: ${f} =====\n\n${slice}`);
      } catch {}
    }
    const corpus = parts.join('\n');
    const outPath = path.join(os.tmpdir(), `corpus-${Date.now()}.txt`);
    fs.writeFileSync(outPath, corpus, 'utf8');
    return { outPath, bytes: Buffer.byteLength(corpus, 'utf8'), fileCount: files.length };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('analyze:ollamaExtract', async (_evt, { filePath, instruction = 'Extract key functions and TODOs', model = 'llama3.1' }) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const prompt = `${instruction}\n\nFILE: ${filePath}\n\n${content}`;
    const body = JSON.stringify({ model, prompt, stream: false });
    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => { let data = ''; res.on('data', (c) => (data += c)); res.on('end', () => resolve(data)); }
      );
      req.on('error', reject);
      req.write(body); req.end();
    });
    const json = JSON.parse(response);
    return { result: json?.response || '' };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('analyze:exportInsights', async (_evt, { data, outPath }) => {
  try {
    let target = outPath;
    if (!target) {
      const res = await dialog.showSaveDialog({ filters: [{ name: 'Text', extensions: ['txt', 'md'] }] });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath;
    }
    fs.writeFileSync(target, data, 'utf8');
    return { outPath: target };
  } catch (err) {
    return { error: String(err) };
  }
});

// --- Dependency analysis and explanation ---
function tryResolveLocalImport(baseFile, spec) {
  try {
    const baseDir = path.dirname(baseFile);
    const isRelative = spec.startsWith('.') || spec.startsWith('/');
    if (!isRelative) return null; // skip packages
    const candidates = [];
    const root = spec.startsWith('/') ? spec : path.resolve(baseDir, spec);
    const stems = [root];
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.css', '.scss'];
    for (const stem of stems) {
      // exact file as given
      candidates.push(stem);
      // with extensions
      for (const ext of exts) candidates.push(stem + ext);
      // index files in folder
      for (const ext of exts) candidates.push(path.join(stem, 'index' + ext));
    }
    for (const c of candidates) {
      try {
        const st = fs.statSync(c);
        if (st.isFile()) return c;
      } catch {}
    }
  } catch {}
  return null;
}

function extractImportSpecifiers(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    const specs = new Set();
    // import ... from 'x';  import 'x';
    const importRe = /import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"\n]+)['"];?/g;
    // require('x')
    const requireRe = /require\(\s*['"]([^'"\n]+)['"]\s*\)/g;
    let m;
    while ((m = importRe.exec(src))) specs.add(m[1]);
    while ((m = requireRe.exec(src))) specs.add(m[1]);
    return Array.from(specs);
  } catch {
    return [];
  }
}

function collectLocalDependencies(entryFile, { maxDepth = 3, maxFiles = 32 } = {}) {
  const visited = new Set();
  const queue = [{ file: entryFile, depth: 0 }];
  const files = [];
  while (queue.length && files.length < maxFiles) {
    const { file, depth } = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      files.push({ path: file, content, size: Buffer.byteLength(content, 'utf8') });
    } catch {
      continue;
    }
    if (depth >= maxDepth) continue;
    const specs = extractImportSpecifiers(file);
    for (const s of specs) {
      const resolved = tryResolveLocalImport(file, s);
      if (resolved && !visited.has(resolved)) queue.push({ file: resolved, depth: depth + 1 });
      if (files.length + queue.length >= maxFiles) break;
    }
  }
  return files;
}

async function explainWithOpenAI({ model, messages }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const body = JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature: 0 });
  const response = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  try {
    const json = JSON.parse(response);
    const content = json?.choices?.[0]?.message?.content || '';
    return content;
  } catch {
    return 'Error parsing OpenAI response.';
  }
}

async function explainWithOllama({ model, prompt }) {
  const body = JSON.stringify({ model: model || 'llama3.1', prompt, stream: false });
  const response = await new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let data = ''; res.on('data', (c) => (data += c)); res.on('end', () => resolve(data)); }
    );
    req.on('error', reject);
    req.write(body); req.end();
  });
  try {
    const json = JSON.parse(response);
    return json?.response || '';
  } catch {
    return 'Error parsing Ollama response.';
  }
}

ipcMain.handle('analyze:explain', async (_evt, { input, rootDir, model, provider = 'auto', maxDepth = 3, maxFiles = 24, maxBytesPerFile = 150_000 }) => {
  try {
    // Resolve the root file path
    let entry = input;
    const looksAbsolute = typeof entry === 'string' && (entry.startsWith('/') || entry.match(/^\w:[/\\]/));
    const exists = looksAbsolute && fs.existsSync(entry);
    if (!exists) {
      // If input looks like a bare file name, search within rootDir
      if (!rootDir) return { error: 'rootDir required to search for file' };
      const all = walkDir(rootDir);
      const matches = all.filter((p) => path.basename(p).toLowerCase() === String(input || '').toLowerCase());
      entry = matches[0] || null;
      if (!entry) return { error: `File not found: ${input}` };
    }

    // Collect dependencies limited by bounds
    const files = collectLocalDependencies(entry, { maxDepth, maxFiles });
    // Trim oversized contents
    const trimmed = files.map((f) => {
      const content = f.content.length > maxBytesPerFile ? f.content.slice(0, maxBytesPerFile) : f.content;
      return { path: f.path, size: f.size, bytes: Buffer.byteLength(content, 'utf8'), content };
    });

    const insightsLines = [];
    insightsLines.push(`Entry: ${entry}`);
    insightsLines.push(`Dependencies included: ${trimmed.length}`);
    for (const f of trimmed) insightsLines.push(`- ${f.path} (${f.bytes} bytes)`);
    const insights = insightsLines.join('\n');

    // Build prompt/messages
    const header = 'You are a senior engineer. Explain the following entry file and its local dependencies clearly. Provide:\n\n1) High-level purpose\n2) Module relationships\n3) Key functions/classes\n4) Risks/edge cases\n5) Suggested improvements.\n\nKeep it concise and skimmable.';
    const joined = trimmed
      .map((f) => `\n\n===== FILE: ${f.path} =====\n\n${f.content}`)
      .join('');
    const prompt = `${header}\n\nENTRY=${entry}\n${joined}`;

    let explanation = '';
    if (provider === 'openai') {
      explanation = await explainWithOpenAI({ model, messages: [{ role: 'system', content: 'You are a precise code explainer.' }, { role: 'user', content: prompt }] });
    } else if (provider === 'ollama') {
      explanation = await explainWithOllama({ model, prompt });
    } else {
      // auto: try OpenAI then Ollama
      const tryOpenAI = await explainWithOpenAI({ model, messages: [{ role: 'system', content: 'You are a precise code explainer.' }, { role: 'user', content: prompt }] });
      if (tryOpenAI) explanation = tryOpenAI; else explanation = await explainWithOllama({ model, prompt });
    }

    if (!explanation) {
      explanation = 'No provider available. Here are the files gathered:\n' + insights;
    }

    return { rootFile: entry, files: trimmed.map(({ content, ...rest }) => rest), explanation, insights };
  } catch (err) {
    return { error: String(err) };
  }
});

// --- Terminal process management ---
const terminals = new Map(); // id -> { child, name }

function nowTs() {
  return new Date().toISOString();
}

ipcMain.handle('term:start', async (evt, { id, command, args = [], cwd, env, name }) => {
  try {
    if (!id) return { error: 'id required' };
    if (terminals.has(id)) return { error: 'terminal already exists' };
    const child = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...(env || {}) },
      shell: process.platform === 'win32',
    });

    terminals.set(id, { child, name: name || id });

    const send = (chunk, stream) => {
      try {
        evt.sender.send('term:output', { id, stream, data: chunk.toString(), ts: nowTs() });
      } catch {}
    };

    child.stdout.on('data', (d) => send(d, 'stdout'));
    child.stderr.on('data', (d) => send(d, 'stderr'));
    child.on('close', (code) => {
      try { evt.sender.send('term:exit', { id, code, ts: nowTs() }); } catch {}
      terminals.delete(id);
    });
    child.on('error', (err) => {
      try { evt.sender.send('term:error', { id, error: String(err), ts: nowTs() }); } catch {}
    });

    return { ok: true };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('term:write', async (_evt, { id, data }) => {
  try {
    const t = terminals.get(id);
    if (!t) return { error: 'terminal not found' };
    t.child.stdin.write(data);
    return { ok: true };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('term:stop', async (_evt, { id }) => {
  try {
    const t = terminals.get(id);
    if (!t) return { ok: true };
    if (process.platform === 'win32') {
      t.child.kill('SIGTERM');
    } else {
      t.child.kill('SIGINT');
    }
    terminals.delete(id);
    return { ok: true };
  } catch (err) {
    return { error: String(err) };
  }
});

