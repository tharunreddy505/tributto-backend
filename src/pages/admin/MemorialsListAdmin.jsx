import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEye, faSearch, faCrown, faLock, faBookOpen, faUsers, faCommentAlt, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const MemorialsListAdmin = () => {
    const { tributes, deleteTribute, showAlert } = useTributeContext();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.username === 'admin' || user.email?.includes('admin');
    const displayedTributes = isAdmin ? tributes : tributes.filter(t => String(t.userId) === String(user.id) || String(t.user_id) === String(user.id));
    const hasActiveSubscription = isAdmin || user.subscriptionStatus === 'active';

    // Calculate stats dynamically based on displayed tributes
    const totalVisits = displayedTributes.reduce((sum, t) => sum + (t.views || 0), 0);
    const totalComments = displayedTributes.reduce((sum, t) => sum + (t.comments?.length || 0), 0);

    // Simple growth metric: % of tributes added in the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const newTributes = displayedTributes.filter(t => t.createdAt && new Date(t.createdAt) > thirtyDaysAgo).length;

    // Calculates percentage of total that are new
    const growth = displayedTributes.length > 0 ? Math.round((newTributes / displayedTributes.length) * 100) : 0;

    const stats = [
        { title: 'Memorial Pages', value: displayedTributes.length, icon: faBookOpen, color: 'bg-blue-500' },
        { title: 'Total Visits', value: totalVisits.toLocaleString(), icon: faUsers, color: 'bg-green-500' },
        { title: 'Tribute Entries', value: totalComments, icon: faCommentAlt, color: 'bg-yellow-500' },
        { title: 'New (30 Days)', value: `+${growth}%`, icon: faChartLine, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-400 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${stat.color}`}>
                            <FontAwesomeIcon icon={stat.icon} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                    <div className="relative w-full md:w-64">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search memorials..."
                            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>

                    <Link
                        to="/admin/memorials/new"
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Add New memorial
                    </Link>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 w-16">ID</th>
                                <th className="px-6 py-3">Image</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Dates</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedTributes.map((tribute) => (
                                <tr key={tribute.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-400">#{tribute.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 border border-gray-200">
                                            <img
                                                src={tribute.image || tribute.photo || 'https://via.placeholder.com/150'}
                                                alt={tribute.photoMeta?.alt_text || tribute.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {tribute.name}
                                        <div className="text-xs text-gray-400 font-normal mt-1 truncate max-w-xs">
                                            {(tribute.bio || tribute.text || '').replace(/<[^>]*>/g, '')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {/* Publication Status Badge */}
                                            {tribute.status === 'draft' ? (
                                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit">Draft</span>
                                            ) : tribute.status === 'private' ? (
                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit">Private</span>
                                            ) : (
                                                <span className={`${!(tribute.subscriptionStatus === 'active' || tribute.subscriptionStatus === 'trial' || tribute.isLifetime) ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'} px-2 py-1 rounded text-[10px] font-bold uppercase w-fit`}>
                                                    Public {!(tribute.subscriptionStatus === 'active' || tribute.subscriptionStatus === 'trial' || tribute.isLifetime) && '(Offline)'}
                                                </span>
                                            )}

                                            {/* Subscription Badge */}
                                            {tribute.subscriptionStatus === 'active' || tribute.isLifetime ? (
                                                <span className="text-[10px] text-green-600 font-medium lowercase">● subscription active</span>
                                            ) : tribute.subscriptionStatus === 'trial' ? (
                                                <span className="text-[10px] text-blue-600 font-medium lowercase">● on free trial</span>
                                            ) : (
                                                <span className="text-[10px] text-red-600 font-medium lowercase">● subscription expired</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{tribute.dates}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{tribute.createdAt ? new Date(tribute.createdAt).toLocaleDateString() : 'Unknown'}</span>
                                            {tribute.authorName && (
                                                <Link
                                                    to={`/author/${tribute.authorName}`}
                                                    target="_blank"
                                                    className="text-[11px] text-[#D4AF37] hover:underline font-medium flex items-center gap-1"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                    {tribute.authorName}
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Link
                                            to={`/memorial/${tribute.slug || tribute.id}`}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                                            title="View"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </Link>
                                        <Link
                                            to={`/admin/memorials/edit/${tribute.id}`}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
                                            title="Edit"
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </Link>
                                        <button
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                            title="Delete"
                                            onClick={() => {
                                                showAlert(
                                                    "Are you sure you want to delete this memorial? This will permanently remove all associated photos, videos, and guestbook entries.",
                                                    "error",
                                                    "Confirm Deletion",
                                                    () => deleteTribute(tribute.id),
                                                    null,
                                                    "Delete Memorial",
                                                    "Cancel"
                                                );
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {displayedTributes.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                        <p className="text-lg">No memorials found.</p>
                                        {hasActiveSubscription
                                            ? <p className="text-sm mt-2">Get started by creating your first memorial.</p>
                                            : <p className="text-sm mt-2">Subscribe to start creating memorial pages.</p>
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-sm text-gray-500">Showing {displayedTributes.length} entries</span>
                    <div className="flex gap-1">
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50" disabled>Prev</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-primary text-white text-sm">1</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemorialsListAdmin;
