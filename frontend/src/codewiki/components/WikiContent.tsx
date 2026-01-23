import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WikiSection } from '../types';
import { ChevronRight, FileCode, Hash, Link as LinkIcon } from 'lucide-react';

interface WikiContentProps {
    activeSectionId: string;
    sections: WikiSection[];
    isDarkMode: boolean;
    onLinkClick: (id: string) => void;
}

const WikiContent: React.FC<WikiContentProps> = ({
    activeSectionId,
    sections,
    isDarkMode,
    onLinkClick,
}) => {
    // Recursively find the active section
    const findSection = (sections: WikiSection[], id: string): WikiSection | undefined => {
        for (const s of sections) {
            if (s.id === id) return s;
            if (s.children) {
                const found = findSection(s.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    const activeSection = findSection(sections, activeSectionId) || sections[0];

    // Build titles map for cross-linking
    const titlesMap = useMemo(() => {
        const map = new Map<string, string>();
        const traverse = (secs: WikiSection[]) => {
            secs.forEach(s => {
                map.set(s.title.toLowerCase(), s.id);
                if (s.children) traverse(s.children);
            });
        };
        traverse(sections);
        return map;
    }, [sections]);

    if (!activeSection) return null;

    // Combine content for markdown processing
    const fullMarkdownContent = activeSection.content.join('\n\n');

    return (
        <div className="flex-1 overflow-y-auto px-8 py-12 lg:px-20 scroll-smooth custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                <div
                    key={activeSection.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                    {/* Simplified & Better Breadcrumb */}
                    <nav className={`flex items-center gap-2 mb-6 text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                        <span className="hover:text-blue-500 transition-colors cursor-default">Documentation</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className={`px-2 py-0.5 rounded ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            {activeSectionId === 'overview' ? 'Getting Started' : 'Modules'}
                        </span>
                    </nav>

                    <header className="mb-12">
                        <div className="flex items-center gap-4 group">
                            <h1 className={`text-4xl lg:text-6xl font-black tracking-tighter leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {activeSection.title}
                            </h1>
                            <LinkIcon className="w-6 h-6 text-blue-500/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:text-blue-500" />
                        </div>
                    </header>

                    <div className={`prose prose-lg max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => (
                                    <p className={`text-lg lg:text-xl leading-[1.85] font-normal mb-8 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                        {children}
                                    </p>
                                ),
                                h1: ({ children }) => <h1 className="text-3xl font-bold mt-16 mb-8 border-b border-gray-800 pb-4">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2"><Hash className="w-5 h-5 text-blue-500" />{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xl font-bold mt-10 mb-4 text-blue-400">{children}</h3>,
                                code: ({ inline, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline ? (
                                        <div className="relative group/code my-10 shadow-2xl rounded-2xl overflow-hidden border border-gray-800/50">
                                            <div className="flex items-center justify-between px-4 py-2 bg-[#0B0D13] border-b border-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <FileCode className="w-4 h-4 text-blue-500" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{match ? match[1] : 'code'}</span>
                                                </div>
                                            </div>
                                            <div className={`p-6 font-mono text-sm overflow-x-auto ${isDarkMode ? 'bg-[#0B0D13] text-blue-300' : 'bg-slate-950 text-blue-100'
                                                }`}>
                                                <pre className="whitespace-pre">
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <code className={`px-1.5 py-0.5 rounded-md font-mono text-sm ${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-700'
                                            }`} {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                ul: ({ children }) => <ul className="space-y-4 my-8 list-none pl-0">{children}</ul>,
                                li: ({ children }) => (
                                    <li className="flex gap-4 items-start">
                                        <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] flex-shrink-0" />
                                        <div className={`text-lg leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>{children}</div>
                                    </li>
                                ),
                                strong: ({ children }) => <strong className="font-extrabold text-blue-500">{children}</strong>,
                                blockquote: ({ children }) => (
                                    <blockquote className={`pl-6 border-l-4 border-blue-600/50 italic my-10 text-xl ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                        {children}
                                    </blockquote>
                                )
                            }}
                        >
                            {fullMarkdownContent}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WikiContent;
