import React from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faEye, faComment, faHeart, faCalendar, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';

const MemorialStatsAdmin = () => {
    const { tributes, fetchTributes } = useTributeContext();

    React.useEffect(() => {
        if (fetchTributes) fetchTributes();
    }, []);
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.username === 'admin' || user.email?.includes('admin');

    const displayedTributes = isAdmin ? tributes : tributes.filter(t => t.userId === user.id);

    // Pagination Derivations
    const totalPages = Math.ceil(displayedTributes.length / itemsPerPage);
    const paginatedTributes = displayedTributes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculations
    const totalViews = displayedTributes.reduce((sum, t) => sum + (t.views || 0), 0);
    const totalComments = displayedTributes.reduce((sum, t) => sum + (t.comments?.length || 0), 0);
    const publishedCount = displayedTributes.filter(t => t.subscriptionStatus === 'active' || t.isLifetime).length;
    const trialCount = displayedTributes.filter(t => t.subscriptionStatus === 'trial').length;
    const draftCount = displayedTributes.length - publishedCount - trialCount;

    // Sort by views for top performing
    const topTributes = [...displayedTributes].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const mostCommented = [...displayedTributes].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0)).slice(0, 5);

    const stats = [
        { label: 'Total Memorials', value: displayedTributes.length, icon: faChartBar, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Views', value: totalViews, icon: faEye, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Comments', value: totalComments, icon: faComment, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Published', value: publishedCount + trialCount, icon: faCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Memorial Statistics</h2>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Live Updates
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-xl`}>
                                <FontAwesomeIcon icon={stat.icon} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-2xl font-black text-gray-800">{stat.value.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views Chart (Bar) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEye} className="text-indigo-500" />
                        Top Memorials by Views
                    </h3>
                    <div className="space-y-4">
                        {topTributes.length > 0 ? topTributes.map((t, idx) => {
                            const percentage = totalViews > 0 ? ((t.views || 0) / totalViews) * 100 : 0;
                            return (
                                <div key={t.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700 truncate max-w-[200px]">{t.name}</span>
                                        <span className="font-bold text-indigo-600">{t.views || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.max(5, percentage)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center py-10 text-gray-400 italic">No view data available</p>}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-blue-500" />
                        Status Distribution
                    </h3>
                    <div className="flex items-center justify-center py-4">
                        <div className="relative w-48 h-48">
                            {/* Simple Pie/Donut with SVG */}
                            <svg viewBox="0 0 36 36" className="w-full h-full">
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="3"></circle>
                                {displayedTributes.length > 0 && (
                                    <>
                                        <circle
                                            cx="18" cy="18" r="15.915"
                                            fill="transparent" stroke="#10b981" strokeWidth="3"
                                            strokeDasharray={`${((publishedCount + trialCount) / displayedTributes.length) * 100} ${100 - (((publishedCount + trialCount) / displayedTributes.length) * 100)}`}
                                            strokeDashoffset="25"
                                        ></circle>
                                    </>
                                )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-gray-800">{displayedTributes.length}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs font-bold text-gray-500">Published: {publishedCount + trialCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                            <span className="text-xs font-bold text-gray-500">Drafts: {draftCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">Detailed Analytics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Memorial</th>
                                <th className="px-6 py-4">Views</th>
                                <th className="px-6 py-4">Comments</th>
                                <th className="px-6 py-4">Images</th>
                                <th className="px-6 py-4">Videos</th>
                                <th className="px-6 py-4">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedTributes.map((t) => {
                                const score = ((t.views || 0) * 1 + (t.comments?.length || 0) * 5);
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-800">{t.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faEye} className="text-gray-300 text-xs" />
                                                {t.views || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faComment} className="text-gray-300 text-xs" />
                                                {t.comments?.length || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{t.images?.length || 0}</td>
                                        <td className="px-6 py-4">{t.videos?.length || 0}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${score > 50 ? 'bg-green-100 text-green-700' : score > 10 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {score > 50 ? 'Excellent' : score > 10 ? 'Good' : 'Needs Love'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 gap-4">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                            Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, displayedTributes.length)}</span> of <span className="text-gray-900">{displayedTributes.length}</span> entries
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-500 font-bold text-xs hover:text-black hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>

                            {Array.from({ length: totalPages }).map((_, idx) => {
                                const page = idx + 1;
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${currentPage === page ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-400'}`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="text-gray-400 text-xs px-1">...</span>;
                                }
                                return null;
                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-500 font-bold text-xs hover:text-black hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemorialStatsAdmin;
