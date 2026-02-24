import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Plus, X, Terminal as TerminalIcon, Trash2, SplitSquareHorizontal, ChevronDown } from 'lucide-react';

interface TerminalInstance {
    id: string;
    name: string;
}

const VSCodeTerminal: React.FC = () => {
    const [terminals, setTerminals] = useState<TerminalInstance[]>([
        { id: 'term-1', name: 'pwsh' }
    ]);
    const [activeId, setActiveId] = useState<string>('term-1');
    const terminalRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const xterms = useRef<Record<string, { term: Terminal, fit: FitAddon }>>({});

    const createTerminal = () => {
        const id = `term-${Date.now()}`;
        setTerminals(prev => [...prev, { id, name: 'pwsh' }]);
        setActiveId(id);
    };

    const removeTerminal = async (id: string) => {
        if (window.api?.termStop) {
            await window.api.termStop(id);
        }

        setTerminals(prev => {
            const next = prev.filter(t => t.id !== id);
            if (next.length === 0) {
                const newId = `term-${Date.now()}`;
                return [{ id: newId, name: 'pwsh' }];
            }
            return next;
        });

        if (activeId === id) {
            const others = terminals.filter(t => t.id !== id);
            if (others.length > 0) setActiveId(others[0].id);
        }

        if (xterms.current[id]) {
            xterms.current[id].term.dispose();
            delete xterms.current[id];
        }
        delete terminalRefs.current[id];
    };

    useEffect(() => {
        terminals.forEach(t => {
            if (!xterms.current[t.id] && terminalRefs.current[t.id]) {
                const term = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: '#0d1117',
                        foreground: '#cccccc',
                        cursor: '#ffffff',
                        selectionBackground: '#264f78',
                    },
                    fontSize: 13,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                });
                const fit = new FitAddon();
                term.loadAddon(fit);
                term.open(terminalRefs.current[t.id]!);
                fit.fit();

                xterms.current[t.id] = { term, fit };

                term.onData(data => {
                    if (window.api?.termWrite) {
                        window.api.termWrite(t.id, data);
                    }
                });

                if (window.api?.termStart) {
                    window.api.termStart({
                        id: t.id,
                        command: 'powershell.exe',
                        name: t.name
                    });
                }
            }
        });
    }, [terminals]);

    useEffect(() => {
        if (window.api?.onTermOutput) {
            const cleanup = window.api.onTermOutput((payload) => {
                const xt = xterms.current[payload.id];
                if (xt) {
                    xt.term.write(payload.data);
                }
            });
            return cleanup;
        }
    }, [terminals]);

    useEffect(() => {
        const handleResize = () => {
            Object.values(xterms.current).forEach(xt => xt.fit.fit());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Ensure active terminal is fitted when switched
    useEffect(() => {
        const active = xterms.current[activeId];
        if (active) {
            setTimeout(() => active.fit.fit(), 0);
        }
    }, [activeId]);

    return (
        <div className="flex flex-col h-full bg-[#0d1117] border-t border-gray-700 font-sans">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-4 h-9 bg-[#161b22] border-b border-gray-700">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full">
                    <div className="flex items-center gap-2 h-full mr-4 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                        Terminal
                    </div>
                    {terminals.map(t => (
                        <div
                            key={t.id}
                            onClick={() => setActiveId(t.id)}
                            className={`flex items-center gap-2 px-3 h-full text-xs cursor-pointer border-b-2 transition-all ${activeId === t.id
                                    ? 'bg-[#0d1117] border-blue-500 text-white font-medium'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#0d1117]'
                                }`}
                        >
                            <TerminalIcon className="w-3.5 h-3.5" />
                            <span>{t.name}</span>
                            <X
                                className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); removeTerminal(t.id); }}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-1 text-gray-400">
                    <button
                        onClick={createTerminal}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="New Terminal"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Split Terminal">
                        <SplitSquareHorizontal className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-1"></div>
                    <button
                        onClick={() => removeTerminal(activeId)}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Kill Terminal"
                    >
                        <Trash2 className="w-4 h-4 text-red-500/70" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-700 rounded transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
                {terminals.map(t => (
                    <div
                        key={t.id}
                        ref={el => { terminalRefs.current[t.id] = el; }}
                        className={`absolute inset-0 p-2 ${activeId === t.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default VSCodeTerminal;
