import { useState, useRef, useEffect } from 'react'
import CodeEditor from './components/CodeEditor'
import AIAssistant from './components/ChatSections'
import DisplaySidebar from './components/display/DisplaySidebar'
import ResizeDivider from './components/ui/ResizeDivider'
// import VSCodeTerminal from './components/terminal/VSCodeTerminal'
import type { TreeNode } from './types/display'
import { octokit, fetchRepoContent } from './utils/github'
import Navbar from './components/layout/Navbar'
function Display() {
  const [repoInput, setRepoInput] = useState('Pratik9113/government_scheme')
  const [code, setCode] = useState<string>(
    "// Welcome to your editor\nfunction greet(name: string) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('world'));"
  )
  const [activeFile, setActiveFile] = useState<string | undefined>(undefined)
  const [root, setRoot] = useState<{ path: string; children: TreeNode[]; isLocal?: boolean } | undefined>(undefined)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [model, setModel] = useState<"auto" | "openai" | "ollama">("auto")
  const [provider, setProvider] = useState<"auto" | "openai" | "ollama">("auto")
  const [mode, setMode] = useState<string>("edit")
  const [originalForDiff, setOriginalForDiff] = useState<string>("")
  const [proposedForDiff, setProposedForDiff] = useState<string>("")

  // Store local files content in a record: path -> content
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({})
  const [isUploadingLocal, setIsUploadingLocal] = useState(false)

  // Resize states
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [aiWidth, setAIWidth] = useState(400)
  const [terminalHeight, setTerminalHeight] = useState(250)
  const isResizingSidebar = useRef(false)
  const isResizingAI = useRef(false)
  const isResizingTerminal = useRef(false)

  // ---------------- Folder Logic ----------------
  const toggleNode = async (node: TreeNode) => {
    if (!node.isDir) return
    if (!node.expanded) {
      if (!root) return
      // GitHub repos still fetch children lazily
      if (!root.isLocal) {
        const [owner, repo] = root.path.split('/')
        const children = await fetchRepoContent(owner, repo, node.path)
        node.children = children
      }
    }
    node.expanded = !node.expanded
    setRoot(r => r ? ({ ...r, children: [...r.children] }) : r)
  }

  const openFileFromTree = async (filePath: string) => {
    if (!root) return

    if (root.isLocal) {
      const content = localFiles[filePath];
      if (content !== undefined) {
        setActiveFile(filePath);
        setCode(content);
      }
      return;
    }

    const [owner, repo] = root.path.split('/')
    try {
      const res = await octokit.rest.repos.getContent({ owner, repo, path: filePath })
      if (!Array.isArray(res.data) && 'content' in res.data) {
        const content = atob(res.data.content)
        setActiveFile(filePath)
        setCode(content)
      }
    } catch (err) {
      console.error('Error fetching file content:', err)
    }
  }

  const loadRepo = async () => {
    if (!repoInput.includes('/')) return alert('Invalid format: owner/repo')
    const [owner, repo] = repoInput.split('/')
    const tree = await fetchRepoContent(owner, repo)
    setRoot({ path: `${owner}/${repo}`, children: tree, isLocal: false })
    setActiveFile(undefined)
    setLocalFiles({})
  }

  const handleLocalFolderUpload = async (files: FileList) => {
    if (files.length === 0) return;
    setIsUploadingLocal(true);

    const fileMap: Record<string, string> = {};
    const tree: TreeNode[] = [];

    const addToTree = (pathParts: string[], isDir: boolean, fullPath: string) => {
      let currentLevel = tree;
      let currentPath = "";

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = i === pathParts.length - 1;

        let node = currentLevel.find(n => n.name === part);
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            isDir: !isLast || isDir,
            children: [],
            expanded: false
          };
          currentLevel.push(node);
        }
        currentLevel = node.children || [];
      }
    };

    const filePromises = Array.from(files).map(file => {
      const isLikelyBinary = /\.(jpg|jpeg|png|gif|zip|exe|pdf|node|dll|so|dylib|bin|tar|gz|7z|woff|woff2|ttf|eot|ico)$/i.test(file.name);

      return new Promise<void>((resolve) => {
        if (isLikelyBinary || file.size > 2 * 1024 * 1024) {
          addToTree(file.webkitRelativePath.split('/'), false, file.webkitRelativePath);
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const path = file.webkitRelativePath;
          fileMap[path] = content;
          addToTree(path.split('/'), false, path);
          resolve();
        };
        reader.onerror = () => {
          resolve();
        };
        reader.readAsText(file);
      });
    });

    try {
      await Promise.all(filePromises);
      const rootFolderName = files[0]?.webkitRelativePath.split('/')[0] || "Local Project";
      if (tree.length === 1 && tree[0].name === rootFolderName && tree[0].isDir) {
        setRoot({ path: rootFolderName, children: tree[0].children || [], isLocal: true });
      } else {
        setRoot({ path: rootFolderName, children: tree, isLocal: true });
      }
      setLocalFiles(fileMap);
      setActiveFile(undefined);
    } catch (err) {
      console.error("Local upload failed:", err);
    } finally {
      setIsUploadingLocal(false);
    }
  };

  // ---------------- Resize Handlers ----------------
  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = Math.max(180, Math.min(450, e.clientX));
      setSidebarWidth(newWidth);
    }
    if (isResizingAI.current) {
      const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX));
      setAIWidth(newWidth);
    }
    if (isResizingTerminal.current) {
      const newHeight = Math.max(100, Math.min(600, window.innerHeight - e.clientY));
      setTerminalHeight(newHeight);
    }
  }

  const handleMouseUp = () => {
    isResizingSidebar.current = false;
    isResizingAI.current = false;
    isResizingTerminal.current = false;
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden text-gray-300 font-sans selection:bg-blue-500/30">
        <DisplaySidebar
          width={sidebarWidth}
          collapsed={sidebarCollapsed}
          repoInput={repoInput}
          root={root}
          activeFile={activeFile}
          onCollapsedChange={setSidebarCollapsed}
          onRepoInputChange={setRepoInput}
          onLoadRepo={loadRepo}
          onToggleNode={toggleNode}
          onOpenFile={openFileFromTree}
          onLocalFolderUpload={handleLocalFolderUpload}
          isUploadingLocal={isUploadingLocal}
        />

        <ResizeDivider
          onMouseDown={() => { isResizingSidebar.current = true }}
          orientation="vertical"
          isResizing={isResizingSidebar.current}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-gray-900 shadow-2xl relative z-10 overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden relative min-h-0">
            {isUploadingLocal && (
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white font-medium">Processing local folder...</p>
              </div>
            )}
            <CodeEditor
              initialCode={code}
              onChange={(newCode) => setCode(newCode)}
              fileName={activeFile}
              onClose={() => setActiveFile(undefined)}
            />
          </div>

          <ResizeDivider
            onMouseDown={() => { isResizingTerminal.current = true }}
            orientation="horizontal"
            isResizing={isResizingTerminal.current}
          />

          {/* <div style={{ height: terminalHeight }} className="flex-shrink-0">
            <VSCodeTerminal />
          </div> */}
        </main>

        <ResizeDivider
          onMouseDown={() => { isResizingAI.current = true }}
          orientation="vertical"
          isResizing={isResizingAI.current}
        />

        <aside style={{ width: aiWidth }} className="flex flex-col bg-[#161b22] border-l border-gray-700 h-full overflow-hidden">
          <AIAssistant
            root={root}
            activeFile={activeFile}
            model={model}
            provider={provider}
            code={code}
            setOriginalForDiff={setOriginalForDiff}
            setProposedForDiff={setProposedForDiff}
            setMode={setMode}
          />
        </aside>
      </div>
    </div>
  )
}

export default Display