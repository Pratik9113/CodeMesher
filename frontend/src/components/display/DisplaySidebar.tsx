import React from 'react';
import {
    Code,
    X,
    Folder,
    FolderOpen
} from 'lucide-react';
import type { TreeNode } from '../../types/display';
import FolderTree from '../ui/FolderTree';

interface DisplaySidebarProps {
    width: number;
    collapsed: boolean;
    repoInput: string;
    root?: { path: string; children: TreeNode[] };
    activeFile?: string;
    onCollapsedChange: (collapsed: boolean) => void;
    onRepoInputChange: (value: string) => void;
    onLoadRepo: () => void;
    onToggleNode: (node: TreeNode) => void;
    onOpenFile: (path: string) => void;
}

const DisplaySidebar: React.FC<DisplaySidebarProps> = ({
    width,
    collapsed,
    repoInput,
    root,
    activeFile,
    onCollapsedChange,
    onRepoInputChange,
    onLoadRepo,
    onToggleNode,
    onOpenFile
}) => {
    return (
        <aside style={{ width: collapsed ? 50 : width }} className="flex flex-col border-r border-gray-700 bg-gray-900 transition-all duration-300">
            <div className="h-12 flex items-center px-3 border-b border-gray-700">
                {!collapsed ? (
                    <>
                        <div className="flex items-center gap-2 flex-1">
                            <Code className="w-5 h-5 text-blue-500" />
                            <input
                                type="text"
                                placeholder="owner/repo"
                                className="flex-1 px-2 py-1 rounded bg-gray-800 text-white text-sm outline-none border border-transparent focus:border-blue-500/50"
                                value={repoInput}
                                onChange={(e) => onRepoInputChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onLoadRepo()}
                            />
                        </div>
                        <button onClick={() => onCollapsedChange(true)} className="p-1 rounded hover:bg-gray-700 text-gray-400">
                            <X className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <button onClick={() => onCollapsedChange(false)} className="mx-auto p-2 rounded hover:bg-gray-700 text-gray-400">
                        <Folder className="w-5 h-5" />
                    </button>
                )}
            </div>

            {!collapsed && (
                <>
                    <div className="p-3">
                        <button
                            onClick={onLoadRepo}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Load GitHub Repo
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto px-3 py-2 custom-scrollbar">
                        {root ? (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2 truncate" title={root.path}>
                                    {root.path}
                                </div>
                                <FolderTree
                                    nodes={root.children}
                                    depth={0}
                                    activeFile={activeFile}
                                    onToggle={onToggleNode}
                                    onOpenFile={onOpenFile}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 text-center px-4 space-y-2">
                                <Folder className="w-8 h-8 opacity-20" />
                                <p>No repository loaded</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
};

export default DisplaySidebar;
