import { useState, useRef, useEffect } from 'react'
import CodeEditor from './components/CodeEditor'
import AIAssistant from './components/ChatSections'
import DisplaySidebar from './components/display/DisplaySidebar'
import ResizeDivider from './components/ui/ResizeDivider'
import type { TreeNode } from './types/display'
import { octokit, fetchRepoContent } from './utils/github'

function Display() {
  const [repoInput, setRepoInput] = useState('Pratik9113/government_scheme')
  const [code, setCode] = useState<string>(
    "// Welcome to your editor\nfunction greet(name: string) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('world'));"
  )
  const [activeFile, setActiveFile] = useState<string | undefined>(undefined)
  const [root, setRoot] = useState<{ path: string; children: TreeNode[] } | undefined>(undefined)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [model, setModel] = useState<"auto" | "openai" | "ollama">("auto")
  const [provider, setProvider] = useState<"auto" | "openai" | "ollama">("auto")
  const [mode, setMode] = useState<string>("edit")
  const [originalForDiff, setOriginalForDiff] = useState<string>("")
  const [proposedForDiff, setProposedForDiff] = useState<string>("")

  // Resize states
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [aiWidth, setAIWidth] = useState(400)
  const isResizingSidebar = useRef(false)
  const isResizingAI = useRef(false)

  // ---------------- Folder Logic ----------------
  const toggleNode = async (node: TreeNode) => {
    if (!node.isDir) return
    if (!node.expanded) {
      if (!root) return
      const [owner, repo] = root.path.split('/')
      const children = await fetchRepoContent(owner, repo, node.path)
      node.children = children
    }
    node.expanded = !node.expanded
    setRoot(r => r ? ({ ...r, children: [...r.children] }) : r)
  }

  const openFileFromTree = async (filePath: string) => {
    if (!root) return
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
    setRoot({ path: `${owner}/${repo}`, children: tree })
    setActiveFile(undefined)
  }

  // ---------------- Resize Handlers ----------------
  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSidebar.current) {
      let newWidth = e.clientX
      if (newWidth < 180) newWidth = 180
      if (newWidth > 450) newWidth = 450
      setSidebarWidth(newWidth)
    }
    if (isResizingAI.current) {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth < 300) setAIWidth(300)
      else if (newWidth > 800) setAIWidth(800)
      else setAIWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    isResizingSidebar.current = false
    isResizingAI.current = false
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-300 font-sans selection:bg-blue-500/30">
      {/* Sidebar Component */}
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
      />

      {/* Resize Divider */}
      <ResizeDivider
        onMouseDown={() => { isResizingSidebar.current = true }}
        orientation="vertical"
      />

      {/* Main Editor Section */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-900 shadow-2xl relative z-10">
        <div className="flex-1 p-4 overflow-hidden">
          <CodeEditor
            initialCode={code}
            onChange={(newCode) => setCode(newCode)}
            fileName={activeFile}
            onClose={() => setActiveFile(undefined)}
          />
        </div>
      </main>

      {/* AI Resize Divider */}
      <ResizeDivider
        onMouseDown={() => { isResizingAI.current = true }}
        orientation="vertical"
      />

      {/* AI Assistant Panel */}
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
  )
}

export default Display