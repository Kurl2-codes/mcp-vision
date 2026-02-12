import React from 'react';
import { useGallery } from '../hooks/useGallery';
import { API_ENDPOINTS } from '../../../services/api';

export default function Gallery() {
    const { history, identities, isLoading, filters, setFilters, refresh, deleteImage } = useGallery();

    return (
        <div className="h-full flex flex-col animate-fade-in relative z-10">
            {/* Gallery Header / Filter */}
            <div className="mb-6 sticky top-0 z-20 px-1">
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder={`Search ${filters.identity || 'history'} (e.g. "blue shirt", "cup")...`}
                    className="w-full px-5 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none shadow-xl placeholder:text-slate-500"
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
                {isLoading && history.length === 0 ? (
                    <div className="flex justify-center mt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center text-slate-500 mt-20 flex flex-col items-center">
                        <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p>No images found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {history.filter(item => item.filepath).map((item, idx) => (
                            <div key={idx} className="group relative break-inside-avoid">
                                <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-800 border border-slate-700/50 shadow-lg relative group-hover:border-indigo-500/50 transition-all cursor-pointer">
                                    <img
                                        src={`${API_ENDPOINTS.BASE}/${item.filepath.replace(/\\/g, '/')}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                        alt={item.analysis || "Gallery Image"}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <div className="absolute top-2 right-2 flex space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Extract filename from filepath (e.g., "uploads/xyz.jpg" -> "xyz.jpg")
                                                    const filename = item.filepath.split(/[/\\]/).pop();
                                                    deleteImage(filename);
                                                }}
                                                className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors"
                                                title="Delete Image"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
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
        </div>
    );
}
