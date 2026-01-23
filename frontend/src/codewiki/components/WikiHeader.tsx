import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Share2, MessageSquare, Menu, X, ArrowLeft, Sparkles } from 'lucide-react';

interface WikiHeaderProps {
    isDarkMode: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    setIsDarkMode: (dark: boolean) => void;
    onBack: () => void;
    onGenerate: () => void;
    isGenerating: boolean;
    onChatClick: () => void;
    onShareClick: () => void;
}

const WikiHeader: React.FC<WikiHeaderProps> = ({
    isDarkMode,
    isSidebarOpen,
    setIsSidebarOpen,
    setIsDarkMode,
    onBack,
    onGenerate,
    isGenerating,
    onChatClick,
    onShareClick
}) => {
    const navigate = useNavigate();
    return (
        <header className={`flex items-center justify-between px-8 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate('/')}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    title="Go to Homepage"
                >
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                        🏠
                    </div>
                </button>

                <div className="flex items-center gap-1 bg-gray-100/10 dark:bg-gray-800/50 rounded-lg p-1">
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-md transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-white text-gray-600 shadow-sm'}`}
                        title="Back to Playground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/playground')}
                        className={`p-2 rounded-md transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-white text-gray-600 shadow-sm'}`}
                        title="Go to Playground"
                    >
                        <span className="font-bold text-lg leading-none">&gt;</span>
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block"></div>
                <h1 className="text-lg font-bold hidden sm:block">Code Wiki</h1>
            </div>

            <div className="flex-1 lg:max-w-2xl">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-100/50 border-gray-200'}`}>
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border font-medium transition-colors ${isDarkMode
                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                        : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                >
                    {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isGenerating ? 'Gen...' : 'Generate SDK'}</span>
                </button>

                <button
                    onClick={onShareClick}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border font-medium transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                </button>

                <button
                    onClick={onChatClick}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                </button>
            </div>
        </header>
    );
};

export default WikiHeader;
