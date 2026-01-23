import React, { useState } from 'react';
import { X, Send, Mail, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (email: string) => Promise<void>;
    isDarkMode: boolean;
    repoName: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onShare, isDarkMode, repoName }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setErrorMessage('Please enter a valid email address');
            setStatus('error');
            return;
        }

        setStatus('sending');
        setErrorMessage('');
        try {
            await onShare(email);
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
                setEmail('');
            }, 2000);
        } catch (error) {
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Failed to share documentation');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl border transform transition-all animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#161922] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <Mail className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Share Documentation</h3>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Send full wiki to your team</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="text-center">
                                <h4 className="font-bold text-lg">Email Sent!</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Documentation for <strong>{repoName}</strong> shared successfully.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Recipient Email
                                </label>
                                <div className="relative group">
                                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-blue-500' : 'text-gray-400 group-focus-within:text-blue-500'
                                        }`} />
                                    <input
                                        autoFocus
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="colleague@company.com"
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode
                                                ? 'bg-gray-950 border-gray-800 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                                : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                            }`}
                                    />
                                </div>
                                {status === 'error' && (
                                    <p className="text-xs text-red-500 font-medium px-1 flex items-center gap-1">
                                        <X className="w-3 h-3" /> {errorMessage}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${status === 'sending'
                                        ? 'bg-blue-600/50 cursor-wait text-white/50'
                                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25'
                                    }`}
                            >
                                {status === 'sending' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Sending Documentation...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Send Documentation</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t text-center ${isDarkMode ? 'border-gray-800 bg-gray-950/30' : 'border-gray-100 bg-gray-50/30'}`}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        <Sparkles className="w-3 h-3 text-blue-500/50" />
                        Powered by CodeMesher SMTP
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
