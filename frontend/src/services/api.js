// Centralized API Configuration
// Converted from hardcoded strings in App.jsx

const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
    // Base
    BASE: API_BASE_URL,

    // Analysis & Chat
    ANALYZE: `${API_BASE_URL}/analyze`,
    QUESTIONNAIRE: `${API_BASE_URL}/questionnaire`,

    // Sessions
    SESSIONS: `${API_BASE_URL}/sessions`,
    SESSION_HISTORY: (sessionId) => `${API_BASE_URL}/sessions/${sessionId}`,

    // Gallery & History
    HISTORY: `${API_BASE_URL}/history`,
    IDENTITIES: `${API_BASE_URL}/identities`,

    // Operations
    BATCH_UPLOAD: `${API_BASE_URL}/batch_upload`,
    ZOOM: `${API_BASE_URL}/zoom`,

    // Static Resources
    IMAGES: `${API_BASE_URL}/images`,
    UPLOADS: `${API_BASE_URL}/images/uploads`,
    FACES: `${API_BASE_URL}/images/faces`,
};

export const API_CONFIG = {
    headers: {
        'Content-Type': 'application/json',
    },
};
