import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../services/chatService';

interface ChatMessageProps {
    message: Message;
    index: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message: m, index: i }) => {
    return (
        <div
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            style={{ animationDelay: `${i * 0.05}s` }}
        >
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-lg transition-all duration-300 hover:shadow-xl ${m.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/20"
                        : "bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 text-gray-100 shadow-black/40"
                    }`}
            >
                <ReactMarkdown
                    components={{
                        code({ className, children }) {
                            const language = className?.replace("language-", "") || "text";
                            const codeText = String(children).trim();
                            return (
                                <div className="relative bg-black/40 rounded-lg border border-gray-700/50 overflow-hidden mt-3 mb-2 shadow-inner group/code">
                                    <div className="flex items-center justify-between bg-gray-900/80 px-4 py-2 text-[10px] text-gray-400 font-mono border-b border-gray-700/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                                                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                            </div>
                                            <span className="ml-2 uppercase tracking-tight">{language}</span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(codeText);
                                            }}
                                            className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700/50"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className="px-4 py-3 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
                                        <code>{codeText}</code>
                                    </pre>
                                </div>
                            );
                        },
                        p({ children }) {
                            return <p className="mb-2 last:mb-0 leading-relaxed font-normal">{children}</p>;
                        },
                        ul({ children }) {
                            return <ul className="list-disc list-inside space-y-1 my-2 text-gray-300">{children}</ul>;
                        },
                        ol({ children }) {
                            return <ol className="list-decimal list-inside space-y-1 my-2 text-gray-300">{children}</ol>;
                        },
                        strong({ children }) {
                            return <strong className="font-bold text-white">{children}</strong>;
                        }
                    }}
                >
                    {m.content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ChatMessage;
