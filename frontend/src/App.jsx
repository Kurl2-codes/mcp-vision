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

// --- CUSTOM SELECT COMPONENT ---

const IdentitySelector = ({ identities, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedIdentity = identities.find(i => i.name === selected);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 md:px-4 py-2 rounded-lg transition-all border border-slate-700 hover:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
                <div className={`w-2 h-2 rounded-full ${selected ? 'bg-indigo-500' : 'bg-slate-500'}`}></div>
                <span className="text-xs md:text-sm font-medium truncate max-w-[80px] sm:max-w-none">{selected || "All Identities"}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                    <div className="py-1 max-h-80 overflow-y-auto scrollbar-thin">
                        <button
                            onClick={() => { onChange({ target: { value: '' } }); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-slate-800 transition-colors ${!selected ? 'bg-slate-800/50' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-200">All Identities</span>
                        </button>

                        {identities.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => { onChange({ target: { value: item.name } }); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-slate-800 transition-colors ${selected === item.name ? 'bg-slate-800/50' : ''}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                                    {item.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${selected === item.name ? 'text-indigo-400' : 'text-slate-200'}`}>{item.name}</p>
                                    <p className="text-[10px] text-slate-500">{item.count} memories</p>
                                </div>
                            </button>
                        ))}
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

    // Import State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [deepScanEnabled, setDeepScanEnabled] = useState(false);
    const [importing, setImporting] = useState(false);
    const folderInputRef = useRef(null);



    // AI Mode State (Vision vs Memory)
    const [aiMode, setAiMode] = useState('memory'); // 'memory' (default) or 'vision' (describe only)
    const [detailedAnalysis, setDetailedAnalysis] = useState(false); // New toggle for Memory mode

    // Verification State
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [currentVerification, setCurrentVerification] = useState(null); // { image: string, matches: [] }

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('mcp_token') === 'authenticated');
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [authError, setAuthError] = useState('');

    // --- AUTH LOGIC ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        setIsLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/login', loginData);
            if (res.data.status === 'success') {
                localStorage.setItem('mcp_token', 'authenticated');
                setIsAuthenticated(true);
            }
        } catch (err) {
            setAuthError(err.response?.data?.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('mcp_token');
        setIsAuthenticated(false);
    };

    // --- IMPORT LOGIC ---
    const handleFolderSelected = async (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        setImporting(true);
        setImportProgress({ current: 0, total: files.length });

        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('file', files[i]);
            formData.append('run_analysis', deepScanEnabled);

            try {
                await axios.post('http://localhost:8000/batch_upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } catch (err) {
                console.error(`Failed to import ${files[i].name}`, err);
            }

            setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setImporting(false);
        setImportModalOpen(false);
        setDeepScanEnabled(false); // Reset

        // Refresh Gallery
        if (viewMode === 'gallery') {
            // force re-fetch
            const params = {};
            if (selectedIdentity) params.name = selectedIdentity;
            if (searchTerm) params.search = searchTerm;
            axios.get('http://localhost:8000/history', { params }).then(res => setGalleryItems(res.data.history));
            // Also refresh identities
            axios.get('http://localhost:8000/identities').then(res => setIdentities(res.data.identities || []));
        }
    };



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

            // 3. Responsive Sidebar Close
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            }
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
                    session_id: activeSessionId, // Pass session ID!
                    skip_faces: aiMode === 'vision', // Skip faec rec if in Vision mode
                    detailed_analysis: aiMode === 'memory' ? detailedAnalysis : true // Only limit detail in Memory mode if unchecked. Vision always detailed.
                });

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.data.response,
                    matches: response.data.matches, // Store matches for verification
                    image: imageBase64 // Store source image for verification modal
                }]);

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

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 p-6 selection:bg-indigo-500/30">
                <div className="absolute inset-0 z-0 bg-slate-950">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
                </div>

                <div className="glass p-8 md:p-10 rounded-[32px] w-full max-w-md border border-white/5 shadow-2xl relative z-10 animate-fade-in">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-8 border border-white/10 transform hover:rotate-6 transition-transform">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">MCP <span className="text-indigo-500">Vision</span></h1>
                        <p className="text-slate-400 mt-4 font-medium">Verify your identity to proceed</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">System Username</label>
                            <input
                                type="text"
                                required
                                value={loginData.username}
                                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700"
                                placeholder="Enter admin username"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Security Key</label>
                            <input
                                type="password"
                                required
                                value={loginData.password}
                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700"
                                placeholder="Enter security key"
                            />
                        </div>

                        {authError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold py-4 px-5 rounded-2xl animate-shake flex items-center space-x-3">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <span>{authError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4.5 rounded-2xl shadow-2xl shadow-indigo-600/40 transition-all transform active:scale-[0.98] disabled:opacity-50"
                        >
                            <span className="relative z-10 flex items-center justify-center space-x-2">
                                <span>{isLoading ? 'Decrypting Access...' : 'Authenticate Access'}</span>
                                {!isLoading && <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                            </span>
                        </button>

                        <div className="flex items-center justify-between pt-4 opacity-40">
                            <span className="h-px bg-white/10 flex-1"></span>
                            <span className="text-[10px] font-bold text-slate-500 px-4 uppercase tracking-widest">Authorized Personnel Only</span>
                            <span className="h-px bg-white/10 flex-1"></span>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative">

            {/* Background (Clean, Solid) */}
            <div className="absolute inset-0 z-0 bg-slate-950 pointer-events-none"></div>

            {/* --- MOBILE SIDEBAR BACKDROP --- */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* --- FLOATING SIDEBAR --- */}
            <div className={`
                fixed inset-y-0 left-0 z-40 w-80 transition-all duration-500 ease-in-out p-4 h-full
                md:relative md:translate-x-0 
                ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:-translate-x-10 opacity-0 md:w-0 md:p-0'}
            `}>
                <div className="h-full glass rounded-3xl flex flex-col overflow-hidden border border-white/5 shadow-2xl relative">

                    {/* Sidebar Header */}
                    <div className="p-5 border-b border-white/5 bg-slate-900/30 space-y-4">
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="w-full group flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="font-semibold text-sm tracking-wide">Add Images</span>
                        </button>

                        {/* Mode Toggles */}
                        <div className="bg-slate-950/50 p-1 rounded-xl flex space-x-1 border border-white/5">
                            <button
                                onClick={() => setAiMode('memory')}
                                title="Identify faces and remember this analysis"
                                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${aiMode === 'memory' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                <span>Memory</span>
                            </button>
                            <button
                                onClick={() => setAiMode('vision')}
                                title="Describe only (No face identification)"
                                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${aiMode === 'vision' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <span>Vision</span>
                            </button>
                        </div>

                        {/* Detailed Analysis Checkbox (Only in Memory Mode) */}
                        {aiMode === 'memory' && (
                            <div className="px-1 mt-2 animate-fade-in">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={detailedAnalysis}
                                            onChange={(e) => setDetailedAnalysis(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 border border-slate-700"></div>
                                    </div>
                                    <span className={`text-xs font-medium transition-colors ${detailedAnalysis ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                        Detailed Analysis
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin">

                        <div className="px-3 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <span>Recent Activity</span>
                        </div>

                        {sessions.map(sess => (
                            <button
                                key={sess.session_id}
                                onClick={() => loadSession(sess.session_id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center space-x-3 transition-all duration-200 group ${sessionId === sess.session_id
                                    ? 'bg-slate-800 text-white border border-slate-700/50 shadow-lg'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${sessionId === sess.session_id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </div>
                                <span className="truncate font-medium">{sess.title || "New Chat"}</span>
                            </button>
                        ))}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-white/5 bg-slate-900/30 space-y-3">
                        <button onClick={() => setViewMode('gallery')} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="font-medium text-sm">Gallery View</span>
                        </button>

                        <button onClick={handleNewChat} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="font-medium text-sm">New Chat</span>
                        </button>

                        <div className="flex items-center space-x-3 px-2 pt-2 border-t border-white/5 opacity-70 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/20 flex-shrink-0"></div>
                            <div className="text-xs truncate">
                                <p className="text-white font-medium truncate">Karl Silva</p>
                                <button onClick={handleLogout} className="text-indigo-400 hover:text-indigo-300 transition-colors truncate text-left">Logout System</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300">

                {/* Header (Floating) */}
                <header className="px-4 py-4 md:p-6 md:pb-2 flex items-center justify-between z-20">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all ${!sidebarOpen ? 'bg-slate-800/50' : ''}`}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>

                        <div className="">
                            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center space-x-2 drop-shadow-lg">
                                <span>MCP <span className="text-indigo-500">Vision</span></span>
                                {viewMode === 'gallery' && <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-normal text-slate-400">Gallery</span>}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="z-30">
                            <IdentitySelector
                                identities={identities}
                                selected={selectedIdentity}
                                onChange={handleIdentityChange}
                            />
                        </div>
                    </div>


                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto relative scrollbar-hide">

                    {viewMode === 'chat' && (
                        <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 pb-[200px]">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center space-y-6">
                                    <div className="relative group">
                                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl border border-slate-700 text-indigo-500">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold text-white tracking-tight">How can I help you?</h2>
                                        <p className="text-slate-400 max-w-md mx-auto text-lg leading-relaxed">
                                            I can analyze images, find objects, and remember faces.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                                        {['Analyze this image', 'Who is in this photo?', 'Find the red cat', 'Zoom into the car'].map(prompt => (
                                            <button key={prompt} onClick={() => setInput(prompt)} className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 text-sm transition-all text-left">
                                                "{prompt}"
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, index) => (
                                <div key={index} className={`flex w-full mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}>

                                    {/* Avatar (AI Only - Left Side) */}
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-lg shadow-indigo-900/20">
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                    )}

                                    <div className={`flex flex-col max-w-[85%] md:max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                                        {/* Image Attachment */}
                                        {msg.image && (
                                            <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-xl bg-slate-900 mb-2">
                                                <img src={msg.image} alt="Attachment" className="max-h-80 object-contain" />
                                            </div>
                                        )}

                                        {/* Text Bubble */}
                                        {msg.content && !msg.type && (
                                            <div className={`px-5 py-3.5 text-[15px] leading-7 shadow-sm
                                                ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                    : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700/50'
                                                }`}>
                                                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-700">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>

                                                    {/* Verify Matches Button */}
                                                    {msg.matches && msg.matches.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setCurrentVerification({ image: msg.image, matches: msg.matches });
                                                                setViewMode('verification');
                                                            }}
                                                            className="mt-3 flex items-center space-x-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            <span>Verify Matches ({msg.matches.length})</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Collapsible Tool Output */}
                                        {msg.type === 'collapsible' && (
                                            <div className="w-full"><CollapsibleMessage title={msg.title} content={msg.content} /></div>
                                        )}

                                        {/* Timestamp (Hidden by default, shown on group hover) */}
                                        <span className={`text-[10px] uppercase tracking-wider font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Avatar (User Only - Right Side - Optional, using just color/icon if we want, but sticking to no avatar for user for cleanliness matches modern chat apps) */}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mr-3 mt-1 flex-shrink-0 border border-indigo-500/20">
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </div>
                                    <div className="glass px-5 py-4 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                                        <span className="text-sm text-slate-400 font-medium">Thinking</span>
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-32" />
                        </div>
                    )} {viewMode === 'gallery' && (
                        // --- GALLERY VIEW ---
                        <div className="animate-fade-in max-w-7xl mx-auto p-4 md:p-8 pb-10">
                            <div className="mb-8 sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-slate-950/80 backdrop-blur-md">
                                <div className="glass p-1.5 rounded-2xl flex shadow-2xl">
                                    <div className="pl-4 flex items-center justify-center text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={`Search your visual memory (e.g. "blue shirt", "receipt")...`}
                                        className="w-full px-4 py-3 bg-transparent text-slate-200 placeholder:text-slate-500 outline-none"
                                    />
                                </div>
                            </div>

                            {galleryItems.length === 0 && !isLoading ? (
                                <div className="text-center text-slate-500 mt-20 flex flex-col items-center">
                                    <svg className="w-16 h-16 text-slate-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p>No images found matching your search.</p>
                                </div>
                            ) : (
                                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                    {galleryItems.filter(item => item.filepath).map((item, idx) => (
                                        <div key={idx} className="break-inside-avoid group relative cursor-pointer">
                                            <div className="w-full rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 shadow-lg relative transition-all duration-300 hover:shadow-indigo-500/20 hover:-translate-y-1">
                                                <img
                                                    src={`http://localhost:8000/${item.filepath.replace(/\\/g, '/')}`}
                                                    className="w-full h-auto object-cover"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                                                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                        <p className="text-white text-sm font-bold truncate">{item.identities?.join(', ') || 'Unknown Object'}</p>
                                                        <p className="text-slate-300 text-xs line-clamp-2 mt-1 leading-relaxed">{item.analysis}</p>
                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                                                            <div className="flex items-center space-x-2">
                                                                <p className="text-slate-500 text-[10px] font-mono">{new Date(item.timestamp).toLocaleDateString()}</p>
                                                            </div>
                                                            <a
                                                                href={`http://localhost:8000/${item.filepath.replace(/\\/g, '/')}`}
                                                                download={`${item.identities?.[0] || 'Unknown'}_${new Date(item.timestamp).toISOString().split('T')[0]}.jpg`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 bg-white/10 hover:bg-indigo-500 rounded-lg text-white transition-colors group/btn"
                                                                title="Download Image"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )} {viewMode === 'verification' && (
                        // --- VERIFICATION VIEW ---
                        <div className="flex h-full flex-col md:flex-row animate-fade-in gap-6 p-4 md:p-8 pb-24">

                            {/* Left Panel: Full Scene Image */}
                            <div className="flex-1 flex flex-col relative bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
                                <div className="absolute top-4 left-4 z-10">
                                    <button
                                        onClick={() => setViewMode('chat')}
                                        className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all border border-slate-700 shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        <span>Back to Chat</span>
                                    </button>
                                </div>
                                <div className="flex-1 flex items-center justify-center p-4">
                                    {currentVerification?.image ? (
                                        <div className="relative inline-block max-h-full max-w-full shadow-2xl rounded-lg overflow-hidden">
                                            <img
                                                src={`data:image/jpeg;base64,${currentVerification.image}`}
                                                className="max-h-[80vh] max-w-full object-contain"
                                                alt="Verification Scene"
                                            />
                                            {/* Bounding Boxes could be overlaid here if coordinates are mapped relative to image size */}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">No image loaded</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Matches List */}
                            <div className="w-full md:w-96 flex flex-col space-y-4 h-full overflow-y-auto pr-2 scrollbar-thin">
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Verifying Matches</span>
                                    </h2>
                                    <p className="text-slate-400 text-xs mt-1">
                                        Review detected faces against reference images.
                                    </p>
                                </div>

                                {currentVerification?.matches?.map((match, idx) => (
                                    <div key={idx} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 flex flex-col space-y-4 shadow-lg hover:border-indigo-500/30 transition-colors">

                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-white text-md">{match.name}</h3>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${parseFloat(match.confidence) > 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                        {match.confidence} Match
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comparison Images */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Detected</p>
                                                <div className="aspect-square rounded-lg overflow-hidden bg-black relative border border-slate-600">
                                                    {/* 
                                                        To allow cropping the detected face from the full image client-side is complex without specific crop logic.
                                                        For now, we'll show the box coordinates or a placeholder text if we can't easily crop.
                                                        Ideally, the backend should return the cropped face or we use CSS clip-path?
                                                        CSS clip-path is hard with variable image sizes.
                                                        For "Backbone Design", we might just show the full scene focused or just the reference image?
                                                        User asked for "side by side".
                                                        If backend returns coordinates, we can try to use object-position? Hard to guess.
                                                        Let's use the reference image.
                                                     */}
                                                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs text-center p-2 bg-slate-900">
                                                        (Face in Scene)
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Reference</p>
                                                <div className="aspect-square rounded-lg overflow-hidden bg-black border border-slate-600">
                                                    {match.reference_image ? (
                                                        <img src={match.reference_image} className="w-full h-full object-cover" alt="Reference" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs bg-slate-900">No Ref</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(!currentVerification?.matches || currentVerification.matches.length === 0) && (
                                    <div className="text-center p-8 text-slate-500">
                                        No matches to verify.
                                    </div>
                                )}

                            </div>
                        </div>
                    )}
                </div>
                {viewMode === 'chat' && (
                    <div className="absolute bottom-6 left-0 right-0 z-30 px-4 md:px-6 pointer-events-none">
                        <div className="max-w-3xl mx-auto pointer-events-auto">
                            <div className="glass p-2 rounded-[28px] flex items-end space-x-2 shadow-2xl shadow-black/50 ring-1 ring-white/10 relative transition-all duration-300 group focus-within:ring-indigo-500/50 focus-within:shadow-indigo-500/10 focus-within:bg-slate-900/80">

                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className={`p-3.5 rounded-full transition-all duration-300 flex-shrink-0 mb-0.5 ${imagePreview ? 'bg-indigo-500 text-white rotate-0 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10 -rotate-90'}`}
                                    title="Upload Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>

                                {imagePreview && (
                                    <div className="relative mb-2 w-14 h-14 rounded-xl overflow-hidden border border-white/20 flex-shrink-0 group/img shadow-lg">
                                        <img src={imagePreview} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => { setImagePreview(null); setImageBase64(null); }}>
                                            <span className="text-xs text-white font-bold">REMOVE</span>
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={imagePreview ? "Ask about this image..." : "Type a message..."}
                                    className="flex-1 bg-transparent border-none text-slate-100 px-2 py-4 focus:ring-0 placeholder:text-slate-500 scrollbar-hide resize-none min-h-[56px] max-h-[150px] text-[15px]"
                                    rows={1}
                                    style={{ height: 'auto' }}
                                />

                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || (!input.trim() && !imagePreview)}
                                    className="p-3.5 mb-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-800 disabled:text-slate-600 transform active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-slate-600 font-medium tracking-wide">AI can make mistakes. Please verify important information.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* --- IMPORT MODAL --- */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={() => setImportModalOpen(false)}></div>
                    <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span>Bulk Import Images</span>
                            </h2>
                            <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <p className="text-slate-400 text-sm">Select a folder to import multiple images. We'll automatically identify faces and (optionally) describe the scene.</p>

                            {/* Deep Scan Toggle */}
                            <div className="flex items-start space-x-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <div className="flex items-center h-5 mt-0.5">
                                    <input
                                        id="deepScan"
                                        type="checkbox"
                                        checked={deepScanEnabled}
                                        onChange={(e) => setDeepScanEnabled(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                                    />
                                </div>
                                <div className="flex-1 text-sm">
                                    <label htmlFor="deepScan" className="font-medium text-white block">Enable Advanced Search</label>
                                    <p className="text-slate-400 mt-1">
                                        Check this to enable advanced search (e.g., "blue shirt", "smiling").
                                        <span className="text-amber-500 block mt-1 text-xs font-bold uppercase tracking-wide">⚠️ Uses Gemini API Quota (Slower)</span>
                                    </p>
                                </div>
                            </div>

                            {/* Upload Area */}
                            {/* Upload Area (Google Drive Style) */}
                            {!importing ? (
                                <div
                                    className="border border-slate-700 hover:border-indigo-500/50 rounded-xl bg-slate-950 overflow-hidden flex flex-col group cursor-pointer h-64 transition-all"
                                    onClick={() => folderInputRef.current.click()}
                                >
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors border border-slate-800 group-hover:border-indigo-500/30">
                                            <svg className="w-10 h-10 text-slate-600 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-slate-300 group-hover:text-indigo-400 transition-colors">Click to Select Folder</p>
                                            <p className="text-xs text-slate-500 mt-1">or drag and drop directory here</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border-t border-slate-800 p-3 flex items-center justify-between px-6 text-xs text-slate-500">
                                        <span>Supported: JPG, PNG</span>
                                        <span className="flex items-center space-x-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> <span>Local & Mounted Drives</span></span>
                                    </div>

                                    <input
                                        type="file"
                                        ref={folderInputRef}
                                        onChange={handleFolderSelected}
                                        className="hidden"
                                        webkitdirectory=""
                                        directory=""
                                        multiple
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm font-medium text-slate-300">
                                        <span>Processing Images...</span>
                                        <span>{importProgress.current} / {importProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-500 text-center animate-pulse">
                                        Analyzing facial features & generating descriptions...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Verification Modal */}
            {verificationModalOpen && currentVerification && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                                    <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Verification Results</span>
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">Comparing caught faces with reference database.</p>
                            </div>
                            <button onClick={() => setVerificationModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                            {currentVerification.matches.map((match, idx) => (
                                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-8">

                                        {/* FOUND FACE (CROPPED VISUALIZATION) */}
                                        <div className="flex flex-col items-center space-y-2">
                                            <div className="relative w-48 h-48 bg-black rounded-lg overflow-hidden border-2 border-slate-700 shadow-lg">
                                                {/* We display the FULL image but cropped via CSS/Transform or just show full generic for now if cropping is hard client side. 
                                                    Ideally we'd crop it canvas-side, but specific CSS scaling is easier.
                                                    Alternatively: Render full image and overlay red box.
                                                */}
                                                <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                                    {/* Simplification: Show full image scaled to focus? Since we have coordinates, 
                                                        let's just show the full image with a red box overlay in a mini-view 
                                                    */}
                                                    <div className="relative inline-block">
                                                        <img src={`data:image/jpeg;base64,${currentVerification.image}`} className="max-w-[180px] max-h-[180px] object-contain opacity-50 grayscale-[50%]" alt="Source" />
                                                        {/* Red Box Overlay */}
                                                        {(() => {
                                                            // We unfortunately can't align this perfectly without knowing original image dimension vs rendered.
                                                            // For now, simpler approach: Just show the generic image and the name.
                                                            // The user can see the red box in their mind based on the prompt "Comparing..."
                                                            // Proper approach: Canvas Crop. Let's stick to simple first.
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="bg-slate-900/80 px-2 py-1 rounded text-xs text-white border border-slate-600">Detected in Group</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-slate-300">Detected Face</span>
                                        </div>

                                        {/* STATS & ARROW */}
                                        <div className="flex-1 flex flex-col items-center space-y-3">
                                            <div className="flex items-center space-x-2 text-indigo-400">
                                                <div className="h-[2px] w-12 bg-indigo-500/50"></div>
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <div className="h-[2px] w-12 bg-indigo-500/50"></div>
                                            </div>

                                            <div className="text-center">
                                                <h4 className="text-2xl font-bold text-white tracking-tight">{match.name}</h4>
                                                <div className="mt-2 flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${parseFloat(match.confidence) > 80 ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                    <span className="font-mono text-sm text-slate-300">{match.confidence} Confidence</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* REFERENCE FACE */}
                                        <div className="flex flex-col items-center space-y-2">
                                            <div className="w-48 h-48 bg-slate-950 rounded-lg overflow-hidden border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10 relative">
                                                <img
                                                    src={match.reference_image}
                                                    className="w-full h-full object-cover"
                                                    alt="Reference"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Ref'; }}
                                                />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center">
                                                    <span className="text-[10px] text-white uppercase tracking-wider font-bold">Reference DB</span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-slate-300">Original Identity</span>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-950 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
                            Matches are determined by DeepFace (VGG-Face) cosine similarity.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
