import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../../services/api';

export function useGallery() {
    const [history, setHistory] = useState([]);
    const [identities, setIdentities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        identity: '',
        search: ''
    });

    const fetchIdentities = useCallback(async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.IDENTITIES);
            setIdentities(res.data.identities || []); // Adjust based on actual API response structure (names vs identities)
        } catch (error) {
            console.error("Failed to fetch identities", error);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.identity) params.name = filters.identity;
            if (filters.search) params.search = filters.search;

            const res = await axios.get(API_ENDPOINTS.HISTORY, { params });
            setHistory(res.data.history || []);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Initial Load
    useEffect(() => {
        fetchIdentities();
    }, [fetchIdentities]);

    // Fetch history when filters change (debounced for search)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHistory();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [fetchHistory]);

    return {
        history,
        identities,
        isLoading,
        filters,
        setFilters,
        refresh: fetchHistory,
        refreshIdentities: fetchIdentities
    };
}
