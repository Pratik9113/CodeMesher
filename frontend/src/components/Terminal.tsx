import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

type Proc = {
  id: string
  name: string
}

type Output = {
  id: string
  stream: 'stdout' | 'stderr'
  data: string
  ts: string
}

const theme = {
  background: '#0b0f14',
  foreground: '#d0d4db',
  cursor: '#d0d4db',
  black: '#000000',
  red: '#ff5f56',
  green: '#27c93f',
  yellow: '#f2e94e',
  blue: '#1e90ff',
  magenta: '#ff7eb6',
  cyan: '#2ee6d6',
  white: '#d0d4db',
}

export default function TerminalView({ cwd }: { cwd?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const stdinInputRef = useRef<HTMLInputElement | null>(null)
  const customInputRef = useRef<HTMLInputElement | null>(null)

  const [tabs, setTabs] = useState<Proc[]>([
    { id: 'shell', name: 'shell' },
    { id: 'custom', name: 'custom' },
  ])
  const [activeId, setActiveId] = useState<string>('shell')
  const [input, setInput] = useState<string>('')
  const [customCmd, setCustomCmd] = useState<string>('npm run dev')
  const historyRef = useRef<Record<string, { items: string[]; idx: number }>>({})

  useEffect(() => {
    if (!containerRef.current) return
    const term = new XTerm({ convertEol: true, fontSize: 13, theme })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    xtermRef.current = term
    fitRef.current = fit

    // --- ✅ Enable Copy/Paste Functionality ---
    containerRef.current.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const selection = term.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection)
        term.write('\r\n\u001b[32m[Copied to clipboard]\u001b[0m\r\n')
      } else {
        navigator.clipboard.readText().then((text) => {
          if (text) term.paste(text)
        })
      }
    })

    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Copy selected text
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selection = term.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection)
          term.write('\r\n\u001b[32m[Copied]\u001b[0m\r\n')
          return false
        }
      }
      // Paste text
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((text) => term.paste(text))
        return false
      }
      return true
    })
    // -------------------------------------------

    const onResize = () => fitRef.current?.fit()
    window.addEventListener('resize', onResize)

    const unsubOut = (window as any).api.onTermOutput((payload: Output) => {
      const prefix = payload.stream === 'stderr' ? '\u001b[31m' : '\u001b[36m'
      const reset = '\u001b[0m'
      term.write(`\r\n${prefix}[${payload.id}] ${new Date(payload.ts).toLocaleTimeString()}${reset} ${payload.data}`)
    })
    const unsubExit = (window as any).api.onTermExit((p: any) => {
      term.write(`\r\n\u001b[33m[${p.id}] exited with code ${p.code}\u001b[0m\r\n`)
    })
    const unsubErr = (window as any).api.onTermError((p: any) => {
      term.write(`\r\n\u001b[31m[${p.id}] error: ${p.error}\u001b[0m\r\n`)
    })

    return () => {
      window.removeEventListener('resize', onResize)
      ;(unsubOut as any)?.()
      ;(unsubExit as any)?.()
      ;(unsubErr as any)?.()
      term.dispose()
    }
  }, [])

  function ensureHistory(tabId: string) {
    if (!historyRef.current[tabId]) historyRef.current[tabId] = { items: [], idx: -1 }
    return historyRef.current[tabId]
  }

  function addHistory(tabId: string, cmd: string) {
    const h = ensureHistory(tabId)
    if (cmd.trim().length === 0) return
    const last = h.items[h.items.length - 1]
    if (last !== cmd) h.items.push(cmd)
    h.idx = -1
  }

  async function openShellTab() {
    const id = `shell-${Date.now()}`
    const isWin = navigator.userAgent.includes('Windows')
    setTabs((t) => [...t, { id, name: id }])
    setActiveId(id)
    await (window as any).api.termStart({ id, name: id, command: isWin ? 'powershell' : 'bash', args: isWin ? ['-NoExit'] : ['-i'], cwd })
  }

  async function closeActiveTab() {
    if (tabs.length <= 1) return
    const id = activeId
    const idx = tabs.findIndex((t) => t.id === id)
    await (window as any).api.termStop(id)
    setTabs((t) => t.filter((x) => x.id !== id))
    const nextIdx = Math.max(0, idx - 1)
    setActiveId(tabs[nextIdx]?.id || (tabs[0]?.id || 'shell'))
  }

  // Global keyboard shortcuts: Ctrl+Enter restart, Ctrl+C stop, Ctrl+L clear, Ctrl+T new tab, Ctrl+W close, Ctrl+R rename
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const idx = tabs.findIndex(t => t.id === activeId)
        if (idx !== -1) {
          const next = e.shiftKey ? (idx - 1 + tabs.length) % tabs.length : (idx + 1) % tabs.length
          setActiveId(tabs[next].id)
        }
        return
      }
      if (e.ctrlKey && (e.key.toLowerCase() === 't')) {
        e.preventDefault()
        await openShellTab()
        return
      }
      if (e.ctrlKey && (e.key.toLowerCase() === 'w')) {
        e.preventDefault()
        await closeActiveTab()
        return
      }
      if (e.ctrlKey && (e.key.toLowerCase() === 'r')) {
        e.preventDefault()
        const current = tabs.find(t => t.id === activeId)
        const nextName = window.prompt('Rename terminal', current?.name || '')
        if (nextName && nextName.trim()) {
          setTabs(t => t.map(x => x.id === activeId ? { ...x, name: nextName.trim() } : x))
        }
        return
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (activeId === 'shell') {
          const isWin = navigator.userAgent.includes('Windows')
          await (window as any).api.termStop('shell')
          await (window as any).api.termStart({ id: 'shell', name: 'shell', command: isWin ? 'powershell' : 'bash', args: isWin ? ['-NoExit'] : ['-i'], cwd })
        } else if (activeId === 'custom') {
          const { command, args } = parseCmd(customCmd)
          await (window as any).api.termStop('custom')
          await (window as any).api.termStart({ id: 'custom', name: 'custom', command, args, cwd })
        }
      } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        await (window as any).api.termStop(activeId)
      } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        xtermRef.current?.clear()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeId, customCmd, cwd, tabs])

  useEffect(() => {
    stdinInputRef.current?.focus()
  }, [activeId])

  useEffect(() => {
    (async () => {
      const isWin = navigator.userAgent.includes('Windows')
      await (window as any).api.termStop('shell')
      await (window as any).api.termStart({ id: 'shell', name: 'shell', command: isWin ? 'powershell' : 'bash', args: isWin ? ['-NoExit'] : ['-i'], cwd })
    })()
  }, [cwd])

  function parseCmd(cmdline: string): { command: string; args: string[] } {
    const tokens: string[] = []
    let cur = ''
    let inQuote: string | null = null
    for (let i = 0; i < cmdline.length; i++) {
      const ch = cmdline[i]
      if (inQuote) {
        if (ch === inQuote) {
          inQuote = null
        } else {
          cur += ch
        }
      } else {
        if (ch === '"' || ch === '\'') {
          inQuote = ch
        } else if (ch === ' ') {
          if (cur) { tokens.push(cur); cur = '' }
        } else {
          cur += ch
        }
      }
    }
    if (cur) tokens.push(cur)
    const [command, ...args] = tokens
    return { command: command || 'powershell', args }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: '6px 8px', background: '#0b0f14', borderBottom: '1px solid #1b2230' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            style={{
              background: activeId === t.id ? '#111723' : 'transparent',
              color: '#d0d4db',
              border: '1px solid #1b2230',
              borderRadius: 6,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {t.name}
          </button>
        ))}
        {activeId === 'custom' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <input
              ref={customInputRef}
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const { command, args } = parseCmd(customCmd)
                  await (window as any).api.termStop('custom')
                  await (window as any).api.termStart({ id: 'custom', name: 'custom', command, args, cwd })
                }
              }}
              placeholder="command... (e.g. npm run dev)"
              style={{
                minWidth: 320,
                background: '#0f141b',
                color: '#d0d4db',
                border: '1px solid #3a4256',
                borderRadius: 6,
                padding: '6px 10px',
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, background: '#0b0f14' }} />
      <div style={{ display: 'flex', gap: 8, padding: '6px 8px', background: '#0b0f14', borderTop: '1px solid #1b2230' }}>
        <input
          ref={stdinInputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (window as any).api.termWrite(activeId, input + '\n')
              addHistory(activeId, input)
              setInput('')
            } else if (e.key === 'ArrowUp') {
              const h = ensureHistory(activeId)
              if (h.items.length > 0) {
                if (h.idx === -1) h.idx = h.items.length - 1; else h.idx = Math.max(0, h.idx - 1)
                setInput(h.items[h.idx])
                setTimeout(() => stdinInputRef.current?.setSelectionRange(input.length, input.length))
              }
              e.preventDefault()
            } else if (e.key === 'ArrowDown') {
              const h = ensureHistory(activeId)
              if (h.items.length > 0) {
                if (h.idx === -1) return
                h.idx = Math.min(h.items.length, h.idx + 1)
                if (h.idx >= h.items.length) { setInput(''); h.idx = -1 } else { setInput(h.items[h.idx]) }
                setTimeout(() => stdinInputRef.current?.setSelectionRange(input.length, input.length))
              }
              e.preventDefault()
            }
          }}
          placeholder={`Type for ${activeId} and press Enter • Ctrl+Enter start • Ctrl+C stop • Ctrl+L clear`}
          style={{
            flex: 1,
            background: '#0f141b',
            color: '#d0d4db',
            border: '1px solid #1b2230',
            borderRadius: 6,
            padding: '6px 10px',
            outline: 'none'
          }}
        />
      </div>
    </div>
  )
}
