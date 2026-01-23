import React from 'react';
import { Terminal, Settings } from 'lucide-react';
import type { CursorPosition } from '../../types/editor';

interface StatusBarProps {
    cursorPosition: CursorPosition;
    showTerminal: boolean;
    onToggleTerminal: (show: boolean) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
    cursorPosition,
    showTerminal,
    onToggleTerminal
}) => {
    return (
        <div className="flex items-center justify-between bg-[#161b22] px-4 py-1.5 text-[10px] text-gray-500 font-mono select-none border-t border-gray-800">
            <div className="flex items-center gap-4">
                <span className="hover:text-gray-300 transition-colors">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                <span className="opacity-30">|</span>
                <span className="hover:text-gray-300 transition-colors">Spaces: 2</span>
                <span className="opacity-30">|</span>
                <span className="hover:text-gray-300 transition-colors uppercase">UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onToggleTerminal(!showTerminal)}
                    title="Toggle Terminal"
                    className={`flex items-center gap-1.5 p-1 rounded hover:bg-gray-800 transition-colors ${showTerminal ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="font-sans font-medium">Terminal</span>
                </button>
                <button className="p-1 rounded hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default StatusBar;
