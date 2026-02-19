import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';

const MemorialsGrid = () => {
    const { tributes, isInitialized } = useTributeContext();
    const [activeFilter, setActiveFilter] = useState('All');

    // Get all unique starting letters from tributes
    const alphabet = useMemo(() => {
        const letters = tributes.map(t => t.name.charAt(0).toUpperCase());
        return ['All', ...Array.from(new Set(letters)).sort()];
    }, [tributes]);

    // Filter tributes based on active letter
    const filteredTributes = useMemo(() => {
        if (activeFilter === 'All') return tributes;
        return tributes.filter(t => t.name.charAt(0).toUpperCase() === activeFilter);
    }, [tributes, activeFilter]);

    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Filter Bar - Left Aligned */}
            <div className="flex flex-wrap justify-start gap-2 mb-10">
                {alphabet.map(letter => (
                    <button
                        key={letter}
                        onClick={() => setActiveFilter(letter)}
                        className={`h-10 min-w-[40px] px-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeFilter === letter
                            ? 'bg-[#D4AF37] text-white shadow-lg scale-110'
                            : 'bg-[#D4AF37]/70 text-white hover:bg-[#D4AF37] hover:shadow-md'
                            }`}
                    >
                        {letter}
                    </button>
                ))}
            </div>

            {/* Memorials Grid */}
            {filteredTributes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTributes.map((tribute) => (
                        <Link
                            to={`/memorial/${tribute.slug || tribute.id}`}
                            key={tribute.id}
                            className="group relative h-64 overflow-hidden rounded-lg bg-gray-200 shadow-sm transition-all duration-500 hover:shadow-lg"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                <img
                                    src={tribute.images?.[0]?.url || tribute.photo || 'https://images.unsplash.com/photo-1516315609425-46aa1d5a7d7d?q=80&w=2667&auto=format&fit=crop'}
                                    alt={tribute.name}
                                    className="h-full w-full object-cover grayscale-[20%] transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            </div>

                            {/* Content */}
                            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 text-white">
                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/30 bg-gray-300">
                                    <img
                                        src={tribute.photo || 'https://via.placeholder.com/100'}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold leading-tight truncate">
                                        {tribute.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-white/90 mt-0.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[14px]">✳</span>
                                            <span>{tribute.birthDate ? new Date(tribute.birthDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '??.??.????'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[14px]">✝</span>
                                            <span>{tribute.passingDate ? new Date(tribute.passingDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '??.??.????'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <div className="h-16 w-16 rotate-45 border border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <span className="-rotate-45 text-white text-xs font-serif italic">View</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white/50 rounded-2xl border border-gray-100">
                    <p className="text-xl font-serif text-gray-400 italic">No memorials found for "{activeFilter}"</p>
                </div>
            )}
        </div>
    );
};

export default MemorialsGrid;
