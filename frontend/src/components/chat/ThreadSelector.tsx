import React from 'react';

interface ThreadButton {
    key: string;
    label: string;
    icon: string;
}

interface ThreadSelectorProps {
    buttons: ThreadButton[];
    currentThread: string;
    loadingMap: Record<string, boolean>;
    onThreadChange: (key: string) => void;
}

const ThreadSelector: React.FC<ThreadSelectorProps> = ({
    buttons,
    currentThread,
    loadingMap,
    onThreadChange
}) => {
    return (
        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-800/50 bg-gray-900/60 backdrop-blur-xl">
            {buttons.map((b) => (
                <button
                    key={b.key}
                    onClick={() => onThreadChange(b.key)}
                    disabled={!!loadingMap[b.key]}
                    className={`group relative px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-300 ease-out transform hover:scale-105 ${currentThread === b.key
                            ? "border-blue-500/50 text-blue-300 bg-gradient-to-br from-blue-600/20 to-purple-600/20 shadow-lg shadow-blue-500/20"
                            : "border-gray-700/50 hover:border-gray-600 bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <span className="text-sm">{b.icon}</span>
                        {b.label}
                        {loadingMap[b.key] && (
                            <span className="inline-flex gap-0.5 ml-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </span>
                        )}
                    </span>
                    {currentThread === b.key && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-pulse"></div>
                    )}
                </button>
            ))}
        </div>
    );
};

export default ThreadSelector;
