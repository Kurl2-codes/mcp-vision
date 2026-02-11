import React, { useState } from 'react';
import { useChat } from '../features/chat/hooks/useChat';
import ChatInterface from '../features/chat/components/ChatInterface';
import Gallery from '../features/gallery/components/Gallery';
import ImportModal from '../features/import/components/ImportModal';
import Sidebar from '../components/ui/Sidebar';

export default function Home() {
    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'gallery'
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Feature Hooks (Lifted State where needed)
    const chat = useChat();
    // Gallery handles its own state internally via its own hook usage

    const handleNewChat = () => {
        chat.startNewSession();
        setViewMode('chat');
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleLoadSession = (sessionId) => {
        chat.loadSession(sessionId);
        setViewMode('chat');
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">

            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                sessions={chat.sessions}
                activeSessionId={chat.activeSessionId}
                onLoadSession={handleLoadSession}
                onNewChat={handleNewChat}
                viewMode={viewMode}
                onSetViewMode={setViewMode}
                onOpenImport={() => setIsImportModalOpen(true)}
            />

            <main className="flex-1 flex flex-col relative h-full transition-all duration-300">

                {/* Header to toggle sidebar from main content */}
                <header className="absolute top-0 left-0 w-full z-30 pointer-events-none p-4 flex justify-between">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="pointer-events-auto p-2 bg-slate-900/50 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors backdrop-blur-sm shadow-sm"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    {/* Header Title (Dynamic) */}
                    <div className="bg-slate-900/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-800/50 shadow-sm">
                        <h1 className="text-sm font-semibold tracking-tight text-white flex items-center space-x-2">
                            <span>MCP <span className="text-indigo-400">Vision</span></span>
                            {viewMode === 'gallery' && <span className="text-slate-500 text-xs font-normal">/ Gallery</span>}
                        </h1>
                    </div>
                </header>

                <div className="flex-1 h-full overflow-hidden pt-16"> {/* Payload Area */}
                    {viewMode === 'chat' ? (
                        <ChatInterface
                            messages={chat.messages}
                            isProcessing={chat.isProcessing}
                            aiMode={chat.aiMode}
                            setAiMode={chat.setAiMode}
                            detailedAnalysis={chat.detailedAnalysis}
                            setDetailedAnalysis={chat.setDetailedAnalysis}
                            sendMessage={chat.sendMessage}
                        />
                    ) : (
                        <Gallery />
                    )}
                </div>

            </main>

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onUploadComplete={() => {
                    // Ideally verify/refresh gallery if open?
                    // Gallery component handles its own data fetching on mount/filter change.
                    // If we switch to gallery, it will fetch.
                    setViewMode('gallery');
                }}
            />
        </div>
    );
}
