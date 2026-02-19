import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faUsers, faCommentAlt, faChartLine, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { decodeHtml } from '../../utils/htmlUtils';

const DashboardAdmin = () => {
    const { tributes, posts, fetchComments } = useTributeContext();
    const [recentComments, setRecentComments] = useState([]);

    useEffect(() => {
        const load = async () => {
            const data = await fetchComments();
            setRecentComments(data.slice(0, 5));
        };
        load();
    }, [fetchComments]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.username === 'admin' || user.email?.includes('admin');

    // Filter tributes based on role
    const displayedTributes = isAdmin ? tributes : tributes.filter(t => t.userId === user.id);

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
        { title: 'My Memorials', value: displayedTributes.length, icon: faBookOpen, color: 'bg-blue-500' },
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Memorials */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">Recent Memorials</h3>
                            <Link to="/admin/memorials" className="text-xs text-primary font-medium hover:underline">View All</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Date Created</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayedTributes.slice(0, 5).map((tribute) => (
                                        <tr key={tribute.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                                                    <img src={tribute.image || tribute.photo} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                {decodeHtml(tribute.name)}
                                            </td>
                                            <td className="px-6 py-4">{tribute.createdAt ? new Date(tribute.createdAt).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Published</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link to={`/admin/memorials/edit/${tribute.id}`} className="text-blue-600 hover:text-blue-800 mr-3">Edit</Link>
                                                <Link to={`/memorial/${tribute.slug || tribute.id}`} className="text-gray-400 hover:text-gray-600">View</Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayedTributes.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                                No memorials found. <Link to="/admin/memorials/new" className="text-primary hover:underline">Create one now.</Link>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Posts - Admin Only */}
                    {isAdmin && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-700">Recent Posts</h3>
                                <Link to="/admin/posts" className="text-xs text-primary font-medium hover:underline">View All</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Title</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {posts.slice(0, 5).map((post) => (
                                            <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-purple-50 text-purple-500 flex items-center justify-center overflow-hidden">
                                                        {post.featured_image ? (
                                                            <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FontAwesomeIcon icon={faBookOpen} className="text-[10px]" />
                                                        )}
                                                    </div>
                                                    {decodeHtml(post.title)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {post.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link to={`/admin/posts/edit/${post.id}`} className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-bold">Edit</Link>
                                                    <Link to={`/post/${post.slug}`} className="text-gray-400 hover:text-gray-600 text-xs font-bold">View</Link>
                                                </td>
                                            </tr>
                                        ))}
                                        {posts.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-gray-400">
                                                    No posts found. <Link to="/admin/posts/new" className="text-primary hover:underline">Write one.</Link>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Condolences - Only for Admin */}
                    {isAdmin && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-700">Latest Guestbook Entries</h3>
                                <Link to="/admin/condolences" className="text-xs text-primary font-medium hover:underline">View All</Link>
                            </div>
                            <div className="p-6">
                                {recentComments.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentComments.map(comment => (
                                            <div key={comment.id} className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                                    {comment.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-sm font-bold text-gray-800 truncate">{comment.name}</h4>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold">{new Date(comment.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-1 italic mb-1">"{comment.content}"</p>
                                                    <p className="text-[10px] text-primary font-medium uppercase tracking-wider">On: {comment.tribute_name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        No guestbook entries yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 self-start">
                    <h3 className="font-bold text-gray-700 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link to="/admin/memorials/new" className="block w-full text-center bg-primary text-white py-2 rounded hover:bg-opacity-90 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faPlus} />
                            Create New Memorial
                        </Link>
                        {isAdmin && (
                            <>
                                <Link to="/admin/users" className="block w-full text-center bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors font-medium text-sm">
                                    Manage Users
                                </Link>
                                <Link to="/admin/condolences" className="block w-full text-center bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors font-medium text-sm">
                                    Guestbook Messages
                                </Link>
                                <Link to="/admin/settings" className="block w-full text-center bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors font-medium text-sm">
                                    Site Settings
                                </Link>
                            </>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="mt-8">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">System Status</h4>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Database Connected (Local)
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                v1.0.0 Stable
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardAdmin;
