import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// --- COMPONENTS ---

const CollapsibleMessage = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden bg-slate-800/30">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
            >
                <div className="flex items-center space-x-2">
                    <span className="text-indigo-400">
                        {isOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </span>
                    <span className="font-medium text-slate-200 text-sm">{title}</span>
                </div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {isOpen ? 'Collapse' : 'Expand'}
                </span>
            </button>
            {isOpen && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 anime-fade-in">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP ---

function App() {
    // Session State
    const [sessions, setSessions] = useState([]);
    const [sessionId, setSessionId] = useState(null); // null = New Chat (not yet created in DB)
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageBase64, setImageBase64] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Identity & Gallery State
    const [identities, setIdentities] = useState([]);
    const [selectedIdentity, setSelectedIdentity] = useState('');
    const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'gallery'
    const [galleryItems, setGalleryItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (viewMode === 'chat') {
            scrollToBottom();
        }
    }, [messages, isLoading, viewMode]);

    // --- INITIAL DATA FETCH ---
    useEffect(() => {
        const initData = async () => {
            // 1. Fetch Identities
            try {
                const idResponse = await axios.get('http://localhost:8000/identities');
                setIdentities(idResponse.data.identities || []);
            } catch (e) { console.error("Identity Fetch Error", e); }

            // 2. Fetch Sessions
            fetchSessions();
        };
        initData();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await axios.get('http://localhost:8000/sessions');
            setSessions(res.data.sessions || []);
        } catch (e) {
            console.error("Session Fetch Error", e);
        }
    };

    // --- SESSION MANAGEMENT ---

    const handleNewChat = () => {
        setSessionId(null);
        setMessages([{
            role: 'assistant',
            content: 'Welcome to MCP Vision. I can see, identify faces, and remember our history.'
        }]);
        setViewMode('chat');
        if (window.innerWidth < 768) setSidebarOpen(false); // Close sidebar on mobile
    };

    const loadSession = async (id) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/sessions/${id}`);
            setSessionId(id);
            // Transform messages if needed (backend stores image as URL, frontend might need adjustment if logic changes, 
            // but for now we trust `messages` array structure: {role, content, image})
            setMessages(res.data.messages || []);
            setViewMode('chat');
            if (window.innerWidth < 768) setSidebarOpen(false);
        } catch (e) {
            console.error("Load Session Error", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- GALLERY FETCH ---
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const params = {};
                if (selectedIdentity) params.name = selectedIdentity;
                if (searchTerm) params.search = searchTerm;

                const response = await axios.get('http://localhost:8000/history', { params });

                if (viewMode === 'gallery') {
                    setGalleryItems(response.data.history);
                }
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (viewMode === 'gallery') {
            const timeoutId = setTimeout(() => fetchHistory(), 500); // Debounce search
            return () => clearTimeout(timeoutId);
        }
    }, [viewMode, selectedIdentity, searchTerm]);


    // --- DRAG & DROP + PASTE HANDLERS ---
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result.split(',')[1];
                        setImageBase64(base64String);
                        setImagePreview(reader.result);
                    };
                    reader.readAsDataURL(blob);
                    e.preventDefault(); // Prevent double pasting if in input
                }
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (files && files.length > 0 && files[0].type.startsWith("image/")) {
                const file = files[0];
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result.split(',')[1];
                    setImageBase64(base64String);
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
            }
        };

        window.addEventListener('paste', handlePaste);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('paste', handlePaste);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    // --- CHAT LOGIC ---

    const handleIdentityChange = async (e) => {
        setSelectedIdentity(e.target.value);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                setImageBase64(base64String);
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !imageBase64) return;

        const userContent = input;
        const currentImage = imagePreview;

        // Optimistic UI Update
        const tempMsg = { role: 'user', content: userContent, image: currentImage };
        setMessages(prev => [...prev, tempMsg]);

        setInput('');
        setImageBase64(null);
        setImagePreview(null);
        setIsLoading(true);

        try {
            // 1. Ensure Session Exists
            let activeSessionId = sessionId;
            if (!activeSessionId) {
                const sessionRes = await axios.post('http://localhost:8000/sessions');
                activeSessionId = sessionRes.data.session_id;
                setSessionId(activeSessionId);
                fetchSessions(); // Refresh list to show new chat
            }

            // 2. Routing Logic (Zoom / Questionnaire / Analyze)
            if (userContent.toLowerCase().includes('zoom') && currentImage) {
                // Zoom (Logic simplified for brevity - assumes no session storage yet for zoom specific endpoint 
                // unless we upgrade zoom endpoint too. For now, just display result)
                // NOTE: Zoom endpoint doesn't support session_id yet, so it won't save to history properly.
                // We'll just stick to standard flow or accept it doesn't save to session DB for now.
                const label = userContent.toLowerCase().replace(/zoom|in|on|the/g, '').trim();
                const response = await axios.post('http://localhost:8000/zoom', { image_base64: imageBase64, label: label });

                if (response.data.found) {
                    const msg = { role: 'assistant', image: `data:image/${response.data.format};base64,${response.data.cropped_image}`, content: `Zoomed in on **${label}**.` };
                    setMessages(prev => [...prev, msg]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: `I couldn't find a **${label}**.` }]);
                }

            } else if ((userContent.toLowerCase().includes('questionnaire') || userContent.toLowerCase().includes('vla')) && currentImage) {
                // Questionnaire
                setMessages(prev => [...prev, { role: 'assistant', content: "**Running VLA Questionnaire...**" }]);
                const response = await axios.post('http://localhost:8000/questionnaire', { image_base64: imageBase64, prompt: "Run Questionnaire" });
                setMessages(prev => [...prev, { role: 'assistant', type: 'collapsible', title: 'VLA Results', content: response.data.response }]);

            } else {
                // STANDARD ANALYZE / CHAT / RAG
                const response = await axios.post('http://localhost:8000/analyze', {
                    image_base64: imageBase64, // can be null
                    prompt: userContent || "Describe this image.",
                    session_id: activeSessionId // Pass session ID!
                });

                setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);

                // Refresh sessions to update the "Title" preview if it changed
                fetchSessions();

                if (response.data.identities && response.data.identities.length > 0) {
                    const idResponse = await axios.get('http://localhost:8000/identities');
                    setIdentities(idResponse.data.names || []);
                }
            }

        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.detail || "Something went wrong.";
            setMessages(prev => [...prev, { role: 'assistant', content: `**Error**: ${errMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">

            {/* --- SIDEBAR --- */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col relative overflow-hidden flex-shrink-0`}>
                <div className="p-4 min-w-[16rem]"> {/* min-w-64 to prevent text wrapping during transition */}
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="font-semibold text-sm">New Chat</span>
                    </button>

                    <button onClick={() => setViewMode('gallery')} className="mt-2 w-full flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg transition-colors border border-slate-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span className="text-sm font-medium">Open Gallery</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                    <p className="px-2 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Recent History</p>
                    {sessions.map(sess => (
                        <button
                            key={sess.session_id}
                            onClick={() => loadSession(sess.session_id)}
                            className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center space-x-3 transition-colors ${sessionId === sess.session_id ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
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

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col h-full relative">

                {/* Background Gradients */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
                </div>

                {/* --- HEADER --- */}
                <header className="z-10 px-6 py-4 glass-light flex justify-between items-center border-b border-slate-800/50">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h1 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
                            <span>MCP <span className="text-indigo-400">Vision</span></span>
                            {viewMode === 'gallery' && <span className="text-slate-500 text-sm font-normal">/ Gallery</span>}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <select
                            value={selectedIdentity}
                            onChange={handleIdentityChange}
                            className="bg-slate-800/50 border border-slate-700 text-slate-300 text-xs rounded-full px-3 py-2 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-slate-800"
                        >
                            <option value="">All Identities</option>
                            {identities.map(item => (
                                <option key={item.name} value={item.name}>
                                    {item.name} ({item.count})
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* --- SCROLL AREA --- */}
                <div className="z-0 flex-1 overflow-y-auto p-4 md:p-8 relative scrollbar-hide">

                    {viewMode === 'chat' ? (
                        <div className="max-w-3xl mx-auto space-y-6 pb-4">
                            {messages.length === 0 && (
                                <div className="text-center mt-20 space-y-4 animate-fade-in">
                                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/10">
                                        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">How can I help you?</h2>
                                    <p className="text-slate-400">Upload an image or ask a question about your visual history.</p>
                                </div>
                            )}

                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                                    <div className={`flex flex-col max-w-[85%] md:max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                                        {/* Avatar */}
                                        <div className={`flex items-center space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] uppercase font-bold ${msg.role === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-indigo-600 text-white'}`}>
                                                {msg.role === 'user' ? 'You' : 'AI'}
                                            </div>
                                            <span className="text-[10px] text-slate-600">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>

                                        {msg.image && (
                                            <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 shadow-2xl mb-2 group-hover:shadow-indigo-500/10 transition-shadow bg-black/40">
                                                <img src={msg.image} alt="Attachment" className="max-h-80 object-contain" />
                                            </div>
                                        )}
                                        {msg.content && !msg.type && (
                                            <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-transparent text-slate-200'}`}>
                                                <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                                            </div>
                                        )}
                                        {msg.type === 'collapsible' && (
                                            <div className="w-full max-w-full"><CollapsibleMessage title={msg.title} content={msg.content} /></div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="px-5 py-4 flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                    ) : (
                        // --- GALLERY VIEW (Embedded) ---
                        <div className="animate-fade-in">
                            <div className="mb-6 sticky top-0 z-20">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={`Search ${selectedIdentity || 'history'} (e.g. "blue shirt", "cup")...`}
                                    className="w-full px-5 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none shadow-xl"
                                />
                            </div>

                            {galleryItems.length === 0 && !isLoading ? (
                                <div className="text-center text-slate-500 mt-20">No images found.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {galleryItems.filter(item => item.filepath).map((item, idx) => (
                                        <div key={idx} className="group relative break-inside-avoid">
                                            <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-800 border border-slate-700/50 shadow-lg relative group-hover:border-indigo-500/50 transition-all">
                                                <img
                                                    src={`http://localhost:8000/${item.filepath.replace(/\\/g, '/')}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                    <p className="text-white text-xs font-semibold line-clamp-1">{item.identities?.join(', ') || 'Unknown'}</p>
                                                    <p className="text-slate-300 text-[10px] line-clamp-2 mt-1">{item.analysis}</p>
                                                    <p className="text-slate-500 text-[9px] mt-2">{new Date(item.timestamp).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- CHAT INPUT --- */}
                {viewMode === 'chat' && (
                    <div className="z-10 p-4 md:p-6 bg-slate-950 border-t border-slate-800/50">
                        <div className="max-w-3xl mx-auto">
                            <div className="glass p-2 rounded-[24px] flex items-end space-x-2 shadow-2xl shadow-black/50 ring-1 ring-white/10 relative transition-all focus-within:ring-indigo-500/50 focus-within:shadow-indigo-500/10">
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                <button onClick={() => fileInputRef.current.click()} className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 mb-0.5 ${imagePreview ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rotate-0' : 'text-slate-400 hover:text-white hover:bg-slate-800 -rotate-90'}`} title="Upload Image">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                                {imagePreview && (
                                    <div className="relative mb-2 w-12 h-12 rounded-lg overflow-hidden border border-slate-600 flex-shrink-0 group">
                                        <img src={imagePreview} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { setImagePreview(null); setImageBase64(null); }}>
                                            <span className="text-xs text-white">✕</span>
                                        </div>
                                    </div>
                                )}
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={imagePreview ? "Ask about this image..." : "Message MCP Vision..."}
                                    className="flex-1 bg-transparent border-none text-slate-100 px-2 py-3.5 focus:ring-0 placeholder:text-slate-500 scrollbar-hide resize-none min-h-[50px] max-h-[150px]"
                                    rows={1}
                                    style={{ height: 'auto' }}
                                />
                                <button onClick={handleSend} disabled={isLoading || (!input.trim() && !imagePreview)} className="p-3 mb-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-800 disabled:text-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
