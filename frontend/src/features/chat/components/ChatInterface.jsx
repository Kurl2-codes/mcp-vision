import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function ChatInterface({
    messages,
    isProcessing,
    aiMode,
    setAiMode,
    detailedAnalysis,
    setDetailedAnalysis,
    sendMessage
}) {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const [input, setInput] = React.useState('');

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isProcessing]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input, null);
        setInput('');
    };

    return (
        <div className="flex-1 flex flex-col relative bg-slate-950 h-full overflow-hidden">

            {/* Mode Selector (Previously in Sidebar, now optionally here or we keep in Sidebar?
                User's original app had mode selector in sidebar. 
                But ChatInterface might want it near input?
                Let's keep mode selector in Sidebar. 
                Wait, if Sidebar is collapsed, how do we switch mode?
                Original app had it in Sidebar.
                If I removed it from Sidebar (my Sidebar.jsx didn't have it!), I need to put it somewhere.
                Let's put it in the Header of ChatInterface or Sidebar.
                My Sidebar.jsx (step 2133) did NOT have mode selector.
                So I should add it to Sidebar or ChatInterface.
                ChatInterface Header is empty right now (it was in App.jsx).
                Let's add a Header to ChatInterface?
                Or just put it in Sidebar.
                For now, to fix forward, I will add it to Sidebar in next step or add to ChatInterface top bar.
                Let's add a Header to ChatInterface.
            */}

            {/* Header / Mode Switcher logic could go here if not in Sidebar */}
            <div className="absolute top-4 right-4 z-20 flex space-x-2">
                {/* Quick Mode Toggle if Sidebar is closed? */}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="text-center mt-20 space-y-4 animate-fade-in opacity-50">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center shadow-xl">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">How can I help you?</h2>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                            }`}>
                            {msg.image && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 relative group">
                                    <img src={`data:image/jpeg;base64,${msg.image}`} alt="User Upload" className="max-w-full max-h-64 object-cover" />
                                </div>
                            )}
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>

                                {/* VERIFY MATCHES BUTTON */}
                                {msg.matches && msg.matches.length > 0 && (
                                    <button
                                        onClick={() => navigate('/verify', { state: { matches: msg.matches, image: msg.image } })}
                                        className="mt-3 flex items-center space-x-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Verify Matches ({msg.matches.length})</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
                <div className="max-w-4xl mx-auto relative bg-slate-900 rounded-xl border border-slate-800 focus-within:border-indigo-500/50 shadow-lg transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Vision about your images..."
                        className="w-full bg-transparent text-white p-4 pr-12 rounded-xl focus:outline-none resize-none min-h-[60px] max-h-[200px]"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() && !isProcessing}
                        className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
