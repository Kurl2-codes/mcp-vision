import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, API_CONFIG } from '../../../services/api';

export function useChat() {
    // State
    const [messages, setMessages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [aiMode, setAiMode] = useState('memory'); // 'memory' or 'vision'
    const [detailedAnalysis, setDetailedAnalysis] = useState(false);

    // Load Sessions on Mount
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.SESSIONS);
            setSessions(res.data.sessions || []);
            // Set first session as active if none selected
            if (!activeSessionId && res.data.sessions.length > 0 && !messages.length) {
                // Determine logic: do we auto-load? 
                // Legacy App.jsx behavior: didn't auto-load content, just listed sessions.
                // We'll keep it simple: Start New Chat by default.
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        }
    };

    const loadSession = async (sessionId) => {
        try {
            const res = await axios.get(API_ENDPOINTS.SESSION_HISTORY(sessionId));
            setMessages(res.data.messages || []);
            setActiveSessionId(sessionId);
        } catch (error) {
            console.error("Error loading session:", error);
        }
    };

    const startNewSession = async () => {
        try {
            const res = await axios.post(API_ENDPOINTS.SESSIONS);
            setActiveSessionId(res.data.session_id);
            setMessages([]);
            fetchSessions();
        } catch (error) {
            console.error("Error creating session:", error);
        }
    };

    const sendMessage = async (content, imageBase64) => {
        if (!content && !imageBase64) return;

        // Optimistic Update
        const userMsg = { role: 'user', content: content, image: imageBase64 };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            // Ensure session
            let sessionId = activeSessionId;
            if (!sessionId) {
                const sessionRes = await axios.post(API_ENDPOINTS.SESSIONS);
                sessionId = sessionRes.data.session_id;
                setActiveSessionId(sessionId);
            }

            const response = await axios.post(API_ENDPOINTS.ANALYZE, {
                image_base64: imageBase64,
                prompt: content || "Describe this image.",
                session_id: sessionId,
                skip_faces: aiMode === 'vision',
                detailed_analysis: aiMode === 'memory' ? detailedAnalysis : true
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.response,
                matches: response.data.matches, // For verification UI
                image: imageBase64 // Source image for verification
            }]);

            fetchSessions(); // Update title if new chat

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error processing request. Please try again." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        messages,
        isProcessing,
        sessions,
        activeSessionId,
        aiMode,
        setAiMode,
        detailedAnalysis,
        setDetailedAnalysis,
        loadSession,
        startNewSession,
        sendMessage,
        fetchSessions
    };
}
