import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, X, MessageSquare, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

interface WikiChatProps {
    repoUrl: string;
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
}

const WikiChat: React.FC<WikiChatProps> = ({ repoUrl, isOpen, onClose, isDarkMode }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiUrl}/wiki-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    message: userMessage
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to connect to server' }));
                throw new Error(errorData.error || 'Chat failed');
            }

            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                sources: data.sources
            }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `**Error:** ${error instanceof Error ? error.message : 'Something went wrong. Please ensure the wiki is generated first.'}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed right-0 top-0 h-screen w-[450px] z-50 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out border-l ${isDarkMode ? 'bg-[#0F1117] border-gray-800' : 'bg-white border-gray-200'
            } animate-in slide-in-from-right duration-500`}>
            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800 bg-[#161922]/80 backdrop-blur-md' : 'border-gray-200 bg-gray-50/80 backdrop-blur-md'
                } sticky top-0 z-10`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg tracking-tight">Repo Vision AI</h3>
                        <p className={`text-[10px] font-medium uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Real-time Knowledge Assistant</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className={`p-2 rounded-xl transition-all duration-200 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-black'
                        }`}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
                            } animate-pulse`}>
                            <Sparkles className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xl font-bold tracking-tight">How can I help you today?</h4>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Explore your codebase through natural conversation. <br />Ask about architecture, logic, or specific features.
                            </p>
                        </div>
                        <div className="w-full grid grid-cols-1 gap-2">
                            {[
                                { q: 'What does this project do?', icon: '🚀' },
                                { q: 'Explain the main architecture', icon: '🏛️' },
                                { q: 'How is data flow handled?', icon: '⚡' }
                            ].map((item) => (
                                <button
                                    key={item.q}
                                    onClick={() => { setInput(item.q); }}
                                    className={`group flex items-center gap-3 w-full p-4 text-sm text-left rounded-2xl border transition-all duration-300 ${isDarkMode
                                            ? 'border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5 bg-[#161922]'
                                            : 'border-gray-100 hover:border-blue-500/50 hover:bg-blue-50 bg-gray-50'
                                        }`}
                                >
                                    <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                                    <span className="flex-1 font-medium">{item.q}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex gap-3 max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-lg ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : (isDarkMode ? 'bg-indigo-600 text-indigo-100' : 'bg-indigo-100 text-indigo-600')
                                }`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : (isDarkMode ? 'bg-[#161922] text-gray-200 border-gray-800' : 'bg-gray-50 text-gray-800 border-gray-100')
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <div className="font-medium">{msg.content}</div>
                                    ) : (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                code: ({ inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline ? (
                                                        <div className="relative group/code my-4">
                                                            <div className={`absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity`}>
                                                                <button
                                                                    onClick={() => copyToClipboard(String(children), idx)}
                                                                    className="p-1.5 rounded-md bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700 backdrop-blur-sm"
                                                                >
                                                                    {copiedIndex === idx ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                            <div className={`p-4 rounded-xl font-mono text-sm overflow-x-auto border ${isDarkMode ? 'bg-[#0B0D13] border-gray-700/50 text-blue-300' : 'bg-slate-900 border-slate-800 text-blue-200'
                                                                }`}>
                                                                <pre className="whitespace-pre">
                                                                    <code className={className} {...props}>
                                                                        {children}
                                                                    </code>
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <code className={`px-1.5 py-0.5 rounded-md font-mono text-sm ${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-gray-200 text-blue-700'
                                                            }`} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
                                                li: ({ children }) => <li className="pl-1">{children}</li>,
                                                h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 border-b border-gray-800 pb-2">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-md font-bold mb-2 mt-4">{children}</h3>,
                                                strong: ({ children }) => <strong className="font-bold text-blue-400">{children}</strong>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className={`pl-4 border-l-4 border-blue-500/50 italic my-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {children}
                                                    </blockquote>
                                                )
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    )}
                                </div>

                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} pt-1 mr-1`}>sources:</span>
                                        {msg.sources.slice(0, 4).map(source => (
                                            <div key={source} className={`group/source flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-all cursor-default ${isDarkMode
                                                    ? 'bg-[#1a1d27] border-gray-800 text-gray-500 hover:border-blue-500/50 hover:text-blue-400'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 shadow-sm'
                                                }`}>
                                                <div className="w-1 h-1 bg-current rounded-full" />
                                                <span className="font-medium">{source.split('/').pop()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-lg ${isDarkMode ? 'bg-indigo-600 text-indigo-100' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#161922] border-gray-800' : 'bg-gray-50 border-gray-100'
                            }`}>
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.8s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></span>
                                <span className={`text-[11px] font-bold ml-2 uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Container */}
            <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800 bg-[#161922]/30' : 'border-gray-200 bg-gray-50/30'
                } backdrop-blur-xl sticky bottom-0 z-10`}>
                <div className="relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about the codebase..."
                        className={`w-full pl-5 pr-14 py-4 rounded-2xl border outline-none transition-all text-[15px] shadow-sm ${isDarkMode
                                ? 'bg-gray-950 border-gray-800 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                            }`}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className={`absolute right-2.5 top-2.5 p-2.5 rounded-xl transition-all duration-300 ${input.trim() && !isLoading
                                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95'
                                : 'text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center mt-3">
                    <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Powered by Llama 3.3 & Gemini Flash
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WikiChat;
