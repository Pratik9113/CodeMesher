import React from 'react';
import { FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { TreeNode } from '../../types/display';

export const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const colors: { [key: string]: string } = {
        ts: 'text-blue-400',
        js: 'text-yellow-400',
        tsx: 'text-blue-300',
        jsx: 'text-cyan-400',
        py: 'text-green-400',
        css: 'text-pink-400',
        html: 'text-orange-400',
        json: 'text-purple-400',
        md: 'text-gray-400',
    }
    return <FileText className={`w-4 h-4 ${colors[ext || ''] || 'text-blue-400'}`} />
}

interface FolderTreeProps {
    nodes: TreeNode[]
    depth: number
    activeFile?: string
    onToggle: (node: TreeNode) => void
    onOpenFile: (filePath: string) => void
}

const FolderTree: React.FC<FolderTreeProps> = ({ nodes, depth, activeFile, onToggle, onOpenFile }) => {
    return (
        <div className="space-y-1">
            {nodes.map((node) => (
                <div key={node.path} className="select-none">
                    <div
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${node.isDir
                            ? 'hover:bg-gray-700 text-gray-300'
                            : (activeFile === node.path
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'hover:bg-gray-700 text-gray-300')
                            }`}
                        style={{ paddingLeft: depth * 12 + 8 }}
                        onClick={() => node.isDir ? onToggle(node) : onOpenFile(node.path)}
                    >
                        {node.isDir ? (
                            node.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        ) : (
                            getFileIcon(node.name)
                        )}
                        <span className="text-sm truncate flex-1">{node.name}</span>
                    </div>
                    {node.isDir && node.expanded && node.children && node.children.length > 0 && (
                        <FolderTree
                            nodes={node.children}
                            depth={depth + 1}
                            activeFile={activeFile}
                            onToggle={onToggle}
                            onOpenFile={onOpenFile}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

export default FolderTree;
