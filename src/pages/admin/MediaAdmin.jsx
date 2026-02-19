import React, { useState, useRef } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faTrash, faImage, faFilm, faSearch, faPlus, faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const MediaAdmin = () => {
    const { media, uploadGlobalMedia, removeMedia } = useTributeContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const fileInputRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.username === 'admin' || user.email?.includes('admin');

    const filteredMedia = media.filter(m => {
        const matchesUser = isAdmin || m.user_id == user.id;
        const matchesSearch = true;
        const matchesType = filterType === 'all' || m.type === filterType;
        return matchesUser && matchesSearch && matchesType;
    });

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = async (files) => {
        setIsUploading(true);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            const type = file.type.startsWith('video') ? 'video' : 'image';

            reader.onload = async (event) => {
                await uploadGlobalMedia(type, event.target.result, user.id);
                if (i === files.length - 1) setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this media item?")) {
            await removeMedia(id);
            if (selectedMedia?.id === id) setSelectedMedia(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Media Library</h2>
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-md"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    Add New Media
                </button>
                <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Filters Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
                    <div className="flex bg-white border border-gray-200 rounded-md p-1">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${filterType === 'all' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterType('image')}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${filterType === 'image' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setFilterType('video')}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${filterType === 'video' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Videos
                        </button>
                    </div>

                    <div className="relative flex-grow md:max-w-xs">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search media..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                        <span>Total Items: <strong>{filteredMedia.length}</strong></span>
                    </div>
                </div>

                {/* Grid */}
                <div
                    className={`p-6 min-h-[400px] transition-colors ${dragActive ? 'bg-primary/5' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Uploading Media...</p>
                        </div>
                    ) : filteredMedia.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredMedia.map((m) => (
                                <div
                                    key={m.id}
                                    className={`group aspect-square rounded-lg border-2 overflow-hidden bg-gray-50 cursor-pointer transition-all relative ${selectedMedia?.id === m.id ? 'border-primary ring-2 ring-primary/20 shadow-lg' : 'border-transparent hover:border-primary/30'}`}
                                    onClick={() => setSelectedMedia(m)}
                                >
                                    {m.type === 'image' ? (
                                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                                            <FontAwesomeIcon icon={faFilm} size="2x" className="opacity-40" />
                                            <span className="text-[10px] mt-2 uppercase font-bold tracking-tighter opacity-70">Video</span>
                                            <video src={m.url} className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40" muted />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={(e) => handleDelete(e, m.id)}
                                            className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-gray-100 rounded-xl">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                                <FontAwesomeIcon icon={faImage} size="3x" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-400 mb-2">Your library is empty</h3>
                            <p className="text-gray-400 text-sm mb-8">Drag and drop files here or use the button above</p>
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="text-primary font-bold hover:underline py-2 px-4 border border-primary/20 rounded-md"
                            >
                                Select Files to Upload
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Media Details Sidebar/Overlay */}
            {selectedMedia && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-slideUp">
                        {/* Preview Area */}
                        <div className="flex-[3] bg-[#111] flex items-center justify-center p-4 relative group">
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all z-10 md:hidden"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>

                            {selectedMedia.type === 'image' ? (
                                <img src={selectedMedia.url} alt="" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <video src={selectedMedia.url} controls className="max-w-full max-h-full" />
                            )}
                        </div>

                        {/* Details Sidebar */}
                        <div className="flex-1 border-l border-gray-100 p-8 flex flex-col min-w-[320px]">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-bold text-gray-800 text-xl tracking-tight">Attachment Details</h3>
                                <button
                                    onClick={() => setSelectedMedia(null)}
                                    className="text-gray-400 hover:text-dark transition-colors text-2xl"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>

                            <div className="space-y-6 flex-grow overflow-y-auto pr-2">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-16 h-16 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                            {selectedMedia.type === 'image' ? <img src={selectedMedia.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-800"><FontAwesomeIcon icon={faFilm} className="text-white/40" /></div>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Uploaded On</p>
                                            <p className="text-sm font-medium text-gray-700 truncate">{new Date(selectedMedia.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">File Type</p>
                                            <p className="text-xs font-medium text-gray-700 uppercase">{selectedMedia.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">File URL</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={selectedMedia.url.substring(0, 50) + "..."}
                                                    className="flex-grow text-[10px] font-mono bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(selectedMedia.url);
                                                        alert("Link copied!");
                                                    }}
                                                    className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap"
                                                >
                                                    Copy Link
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex gap-4 mt-auto">
                                <button
                                    onClick={(e) => handleDelete(e, selectedMedia.id)}
                                    className="flex-1 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaAdmin;
