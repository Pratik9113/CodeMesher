import React, { useRef } from 'react';

interface ChatInputProps {
    value: string;
    placeholder: string;
    loading: boolean;
    onChange: (v: string) => void;
    onSend: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    placeholder,
    loading,
    onChange,
    onSend
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && value.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="border-t border-gray-800/50 p-4 bg-gray-900/60 backdrop-blur-xl flex items-center gap-3">
            <div className="flex-1 relative">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full bg-gray-800/60 text-gray-100 text-sm px-5 py-3 rounded-2xl outline-none border border-gray-700/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 placeholder-gray-500 backdrop-blur-sm shadow-inner"
                />
            </div>
            <button
                onClick={onSend}
                disabled={loading || !value.trim()}
                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700/50 disabled:to-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/30"
            >
                {loading ? (
                    <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    </span>
                ) : "Send"}
            </button>
        </div>
    );
};

export default ChatInput;
