import React from 'react';
import { Send } from 'lucide-react';
import type { SelectionRange } from '../../types/editor';

interface InstructionBarProps {
    value: string;
    selection: SelectionRange | null;
    isApplying: boolean;
    onChange: (v: string) => void;
    onApply: () => void;
}

const InstructionBar: React.FC<InstructionBarProps> = ({
    value,
    selection,
    isApplying,
    onChange,
    onApply
}) => {
    return (
        <div className="flex gap-2 bg-[#161b22] px-4 py-3 border-t border-gray-700 backdrop-blur-sm">
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Describe the change to apply to the selection..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
            />
            <button
                onClick={onApply}
                disabled={!value.trim() || !selection || isApplying}
                title={selection ? `Apply to selection` : 'Select code to enable'}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs flex items-center gap-2 font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
                {isApplying ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <Send className="w-3 h-3" />
                )}
                <span>{isApplying ? 'Applying...' : 'Apply'}</span>
            </button>
        </div>
    );
};

export default InstructionBar;
