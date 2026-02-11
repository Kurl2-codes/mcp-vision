import React from 'react';

export default function Sidebar({
    isOpen,
    onToggle,
    sessions,
    activeSessionId,
    onLoadSession,
    onNewChat,
    viewMode,
    onSetViewMode,
    onOpenImport
}) {
    return (
        <div className={`${isOpen ? 'w-64' : 'w-0'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col relative overflow-hidden flex-shrink-0`}>
            <div className="p-4 min-w-[16rem]">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="font-semibold text-sm">New Chat</span>
                </button>

                <div className="flex flex-col space-y-2 mt-4">
                    <button
                        onClick={() => onSetViewMode('gallery')}
                        className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-colors border ${viewMode === 'gallery' ? 'bg-slate-800 text-white border-slate-700' : 'text-slate-300 hover:bg-slate-800 border-transparent'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span className="text-sm font-medium">Gallery</span>
                    </button>

                    <button
                        onClick={onOpenImport}
                        className="w-full flex items-center space-x-2 text-slate-300 hover:bg-slate-800 px-4 py-2.5 rounded-lg transition-colors border border-transparent"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <span className="text-sm font-medium">Import Images</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                <p className="px-2 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Recent History</p>
                {sessions.map(sess => (
                    <button
                        key={sess.session_id}
                        onClick={() => onLoadSession(sess.session_id)}
                        className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center space-x-3 transition-colors ${activeSessionId === sess.session_id && viewMode === 'chat' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <span className="truncate">{sess.title || "New Chat"}</span>
                    </button>
                ))}
            </div>

            {/* User / Settings (Bottom) */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center space-x-3 text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                    <div className="text-xs">
                        <p className="text-white font-medium">Karl Silva</p>
                        <p>Pro User</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
