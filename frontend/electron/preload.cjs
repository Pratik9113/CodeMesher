const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (payload) => ipcRenderer.invoke('fs:saveFile', payload),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  aiChat: (messages, provider, model) => ipcRenderer.invoke('ai:chat', { messages, provider, model }),
  analyzeScan: (folderPath) => ipcRenderer.invoke('analyze:scan', folderPath),
  analyzeCollectText: (folderPath, maxBytesPerFile) => ipcRenderer.invoke('analyze:collectText', { folderPath, maxBytesPerFile }),
  analyzeOllamaExtract: (filePath, instruction, model) => ipcRenderer.invoke('analyze:ollamaExtract', { filePath, instruction, model }),
  analyzeExportInsights: (data, outPath) => ipcRenderer.invoke('analyze:exportInsights', { data, outPath }),
  analyzeExplain: (input, rootDir, model, provider, opts) =>
    ipcRenderer.invoke('analyze:explain', { input, rootDir, model, provider, ...(opts || {}) }),
  termStart: (opts) => ipcRenderer.invoke('term:start', opts),
  termWrite: (id, data) => ipcRenderer.invoke('term:write', { id, data }),
  termStop: (id) => ipcRenderer.invoke('term:stop', { id }),
  onTermOutput: (cb) => {
    const handler = (_e, payload) => cb(payload)
    ipcRenderer.on('term:output', handler)
    return () => ipcRenderer.removeListener('term:output', handler)
  },
  onTermExit: (cb) => {
    const handler = (_e, payload) => cb(payload)
    ipcRenderer.on('term:exit', handler)
    return () => ipcRenderer.removeListener('term:exit', handler)
  },
  onTermError: (cb) => {
    const handler = (_e, payload) => cb(payload)
    ipcRenderer.on('term:error', handler)
    return () => ipcRenderer.removeListener('term:error', handler)
  },
});


