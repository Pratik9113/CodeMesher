import React from 'react';
import { Book } from 'lucide-react';
import type { WikiSection, WikiMeta } from '../types';

interface WikiSidebarProps {
    isDarkMode: boolean;
    isSidebarOpen: boolean;
    activeSection: string;
    sections: WikiSection[];
    onSectionClick: (id: string) => void;
    meta?: WikiMeta | null;
}

const WikiSidebar: React.FC<WikiSidebarProps> = ({
    isDarkMode,
    isSidebarOpen,
    activeSection,
    sections,
    onSectionClick,
    meta
}) => {
    const generatedAt = meta?.generated_at ? new Date(meta.generated_at) : null;
    const generatedLabel = generatedAt && !isNaN(generatedAt.getTime())
        ? generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : null;
    const commitShort = meta?.commit ? String(meta.commit).slice(0, 7) : null;

    const renderSection = (section: WikiSection, depth = 0) => {
        const isActive = activeSection === section.id;
        const hasChildren = section.children && section.children.length > 0;

        // Check if any of its children are active
        const isChildActive = (s: WikiSection): boolean => {
            if (s.id === activeSection) return true;
            if (s.children) return s.children.some(isChildActive);
            return false;
        };
        const isActiveBranch = isChildActive(section);

        return (
            <div key={section.id} className="w-full relative">
                {depth === 0 && isActiveBranch && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/80 rounded-full z-10" />
                )}
                <button
                    onClick={() => onSectionClick(section.id)}
                    className={`group relative w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 ${isActive
                        ? (isDarkMode ? 'text-blue-400 font-semibold' : 'text-blue-600 font-semibold')
                        : isActiveBranch && depth === 0
                            ? (isDarkMode ? 'text-gray-100 font-medium' : 'text-gray-900 font-medium')
                            : (isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                    style={{ paddingLeft: `${(depth * 1.5) + 1.25}rem` }}
                >
                    <span className="truncate">
                        {section.title}
                    </span>
                </button>
                {hasChildren && (
                    <div className="mt-1 space-y-1 relative">
                        {/* Vertical line for sub-items branches if parent is active */}
                        {depth === 0 && isActiveBranch && (
                            <div className="absolute left-[5px] top-0 bottom-0 w-[1px] bg-gray-700/30 dark:bg-gray-800/50" />
                        )}
                        {section.children?.map(child => renderSection(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside className={`fixed lg:relative z-20 w-80 h-full border-r ${isDarkMode ? 'border-gray-800 bg-[#0F1117]' : 'border-gray-200 bg-white'} transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        <Book className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Code Wiki</h1>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <h2 className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.15em] mb-4 px-2`}>
                        On this page
                    </h2>
                    <nav className="space-y-1 pr-2">
                        {sections.map((section) => renderSection(section))}
                    </nav>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
                    <p>AI can make mistakes, so double-check it.</p>
                </div>
            </div>
        </aside>
    );
};

export default WikiSidebar;
