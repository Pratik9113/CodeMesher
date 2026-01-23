import React from 'react';

interface ResizeDividerProps {
    onMouseDown: (e: React.MouseEvent) => void;
    orientation: 'horizontal' | 'vertical';
    isResizing?: boolean;
}

const ResizeDivider: React.FC<ResizeDividerProps> = ({ onMouseDown, orientation, isResizing }) => {
    return (
        <div
            onMouseDown={onMouseDown}
            className={`
                ${orientation === 'vertical' ? 'w-1 h-full cursor-col-resize' : 'h-1 w-full cursor-row-resize'}
                bg-gray-800 hover:bg-blue-500/50 transition-colors relative group
                ${isResizing ? 'bg-blue-500' : ''}
            `}
        >
            <div className={`
                absolute inset-0 group-hover:bg-blue-500/20 
                ${isResizing ? 'bg-blue-500/40' : ''}
            `}></div>
        </div>
    );
};

export default ResizeDivider;
