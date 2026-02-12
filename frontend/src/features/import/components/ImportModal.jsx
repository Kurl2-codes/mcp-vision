import React, { useRef, useState } from 'react';
import { useImport } from '../hooks/useImport';

export default function ImportModal({ isOpen, onClose, onUploadComplete }) {
    const { isUploading, progress, uploadStatus, uploadFiles, resetStatus } = useImport();
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const [runAnalysis, setRunAnalysis] = useState(false);

    if (!isOpen) return null;

    const handleFiles = async (files) => {
        if (!files || files.length === 0) return;
        const success = await uploadFiles(files, runAnalysis);
        if (success) {
            setTimeout(() => {
                onUploadComplete?.();
                onClose();
                resetStatus();
            }, 1000);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    // ... existing handleDrag ...
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <span>Import Images</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center justify-center space-y-6">

                    {isUploading ? (
                        <div className="w-full space-y-4">
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    ) : uploadStatus ? (
                        <div className={`text-center space-y-2 ${uploadStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {uploadStatus.type === 'success' ? (
                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            <p className="font-medium">{uploadStatus.message}</p>
                            {uploadStatus.type === 'error' && (
                                <button onClick={resetStatus} className="text-sm underline hover:text-white mt-2">Try Again</button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div
                                className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/30'}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <p className="text-slate-300 font-medium mb-1">Drag & Drop images here</p>
                                <p className="text-slate-500 text-sm mb-6">or click to browse</p>

                                <div className="flex space-x-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-indigo-600/20"
                                    >
                                        Select Files
                                    </button>

                                    {/* Folder Upload (webkitdirectory) */}
                                    <input
                                        ref={folderInputRef}
                                        type="file"
                                        // @ts-ignore - webkitdirectory is non-standard but supported
                                        webkitdirectory=""
                                        directory=""
                                        className="hidden"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                    <button
                                        onClick={() => folderInputRef.current.click()}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium text-sm border border-slate-700"
                                    >
                                        Select Folder
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <input
                                    type="checkbox"
                                    id="runAnalysis"
                                    checked={runAnalysis}
                                    onChange={(e) => setRunAnalysis(e.target.checked)}
                                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                />
                                <label htmlFor="runAnalysis" className="cursor-pointer select-none">
                                    Run Detailed AI Analysis (Slower)
                                </label>
                            </div>
                        </>
                    )}

                    <div className="text-center text-xs text-slate-500 max-w-sm">
                        Supported formats: JPG, PNG, GIF. Images will be analyzed and added to your gallery.
                    </div>
                </div>
            </div>
        </div>
    );
}
