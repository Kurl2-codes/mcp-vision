import { useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../../services/api';

export function useImport() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message: string }

    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setProgress(0);
        setUploadStatus(null);

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await axios.post(API_ENDPOINTS.BATCH_UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });

            setUploadStatus({
                type: 'success',
                message: `Successfully uploaded ${response.data.count || files.length} images.`
            });
            return true; // Success
        } catch (error) {
            console.error("Upload Error:", error);
            setUploadStatus({
                type: 'error',
                message: error.response?.data?.detail || "Failed to upload images."
            });
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    const resetStatus = () => {
        setUploadStatus(null);
        setProgress(0);
    };

    return {
        isUploading,
        progress,
        uploadStatus,
        uploadFiles,
        resetStatus
    };
}
