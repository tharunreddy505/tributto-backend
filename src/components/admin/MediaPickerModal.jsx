import React, { useState } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch, faImage, faFilm } from '@fortawesome/free-solid-svg-icons';

const MediaPickerModal = ({ isOpen, onClose, onSelect, type = 'image' }) => {
    const { media } = useTributeContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(type);

    if (!isOpen) return null;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.username === 'admin' || user.email?.includes('admin');

    const filteredMedia = media.filter(m => {
        const matchesUser = isAdmin || m.user_id == user.id;
        const matchesType = activeTab === 'all' || m.type === activeTab;
        return matchesUser && matchesType;
    });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Select Media</h3>
                        <p className="text-xs text-gray-500 mt-1">Choose an item from your library</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-dark transition-colors text-2xl">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'image' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'video' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Videos
                        </button>
                    </div>
                    <div className="relative flex-grow">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search your library..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6 flex-grow overflow-y-auto">
                    {filteredMedia.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredMedia.map((m) => (
                                <div
                                    key={m.id}
                                    className="group aspect-square rounded-lg border-2 border-transparent hover:border-primary bg-gray-50 cursor-pointer transition-all overflow-hidden relative shadow-sm hover:shadow-md"
                                    onClick={() => onSelect(m)}
                                >
                                    {m.type === 'image' ? (
                                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                                            <FontAwesomeIcon icon={faFilm} className="opacity-40" />
                                            <video src={m.url} className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40" muted />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white text-primary text-[10px] font-bold px-3 py-1 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">Select</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <FontAwesomeIcon icon={faImage} size="3x" className="mb-4 opacity-10" />
                            <p>No media found in your library.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-dark transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaPickerModal;
