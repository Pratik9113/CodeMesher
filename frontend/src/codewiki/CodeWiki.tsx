import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import WikiSidebar from './components/WikiSidebar';
import WikiHeader from './components/WikiHeader';
import WikiContent from './components/WikiContent';
import WikiChat from './components/WikiChat';
import ShareModal from './components/ShareModal';
import { DUMMY_WIKI_DATA } from './data/wikiData';
import type { WikiSection, WikiMeta } from './types';

const CodeWiki = () => {
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sections, setSections] = useState<WikiSection[]>(DUMMY_WIKI_DATA);
    const [activeSection, setActiveSection] = useState(sections[0]?.id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [meta, setMeta] = useState<WikiMeta | null>(null);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
    };

    const handleGenerate = async (url?: string) => {
        const repoUrl = url || window.prompt("Enter GitHub Repository URL:", "https://github.com/Pratik9113/CodeMesher");
        if (!repoUrl) return;

        setIsGenerating(true);
        try {
            const apiUrl = import.meta.env.VITE_API_BACKEND_URL || 'https://codemesherbackend.onrender.com';
            console.log("aopiUrl", apiUrl);
            const response = await fetch(`${apiUrl}/generate-wiki`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: repoUrl })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.sections) {
                setSections(result.sections);
                setMeta(result.meta || null);
                if (result.sections.length > 0) {
                    setActiveSection(result.sections[0].id);
                }
            } else {
                const errorMsg = result.error || 'Unknown error occurred';
                alert(`Generation failed: ${errorMsg}`);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Wiki generation error:', errorMsg);
            alert(`Error generating wiki: ${errorMsg}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = () => {
        if (!sections || sections.length === 0 || sections === DUMMY_WIKI_DATA) {
            alert("No documentation to share. Please generate it first.");
            return;
        }
        setIsShareModalOpen(true);
    };

    const performShare = async (email: string) => {
        try {
            console.log(`Attempting to share wiki with ${email}...`);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiUrl}/share-wiki`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    sections,
                    meta
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to connect to backend' }));
                throw new Error(errorData.error || 'Failed to send email');
            }

            console.log("Wiki shared successfully!");
        } catch (error) {
            console.error('Share error:', error);
            throw error;
        }
    };

    // Landing View for URL Entry
    if (sections === DUMMY_WIKI_DATA || sections.length === 0) {
        return (
            <div className={`flex h-screen items-center justify-center ${isDarkMode ? 'bg-[#0F1117] text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans`}>
                <div className="max-w-md w-full p-8 rounded-2xl border border-gray-700 bg-gray-900/50 backdrop-blur-xl shadow-2xl text-center">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Code Wiki Generator
                    </h1>
                    <p className="text-gray-400 mb-8 text-sm">
                        Enter a public GitHub repository URL to automatically generate standard documentation and SDK guides using AI.
                    </p>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const input = form.elements.namedItem('repoUrl') as HTMLInputElement;
                            handleGenerate(input.value);
                        }}
                        className="space-y-4"
                    >
                        <div className="relative">
                            <input
                                name="repoUrl"
                                type="url"
                                required
                                value={"https://github.com/Pranavlovescode/CrashGPT.git"}
                                placeholder="https://github.com/username/repo"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            <div className="absolute left-3 top-3.5 text-gray-500">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating}
                            className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${isGenerating
                                ? 'bg-blue-600/50 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Generate Documentation</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-[#0F1117] text-gray-100' : 'bg-white text-gray-900'} font-sans antialiased`}>
            <WikiSidebar
                isDarkMode={isDarkMode}
                isSidebarOpen={isSidebarOpen}
                activeSection={activeSection}
                sections={sections}
                onSectionClick={scrollToSection}
                meta={meta}
            />

            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                <WikiHeader
                    isDarkMode={isDarkMode}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    setIsDarkMode={setIsDarkMode}
                    onBack={() => {
                        setSections(DUMMY_WIKI_DATA); // Clear to go back to landing
                        navigate('/playground');
                    }}
                    onGenerate={() => handleGenerate()}
                    isGenerating={isGenerating}
                    onChatClick={() => setIsChatOpen(!isChatOpen)}
                    onShareClick={handleShare}
                />

                {isGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-lg font-medium animate-pulse">Analyzing repository and generating documentation...</p>
                        <p className="text-sm text-gray-500">This requires heavy AI processing and may take a minute.</p>
                    </div>
                ) : (
                    <WikiContent
                        activeSectionId={activeSection}
                        sections={sections}
                        isDarkMode={isDarkMode}
                        onLinkClick={scrollToSection}
                    />
                )}

                <WikiChat
                    repoUrl={meta?.repo_url || ''}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    isDarkMode={isDarkMode}
                />

                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    onShare={performShare}
                    isDarkMode={isDarkMode}
                    repoName={meta?.repo_url?.split('/').pop() || 'Repository'}
                />
            </main>
        </div>
    );
};

export default CodeWiki;
