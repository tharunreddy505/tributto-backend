import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEye, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';

const MemorialsListAdmin = () => {
    const { tributes, deleteTribute } = useTributeContext();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.username === 'admin' || user.email?.includes('admin');
    const displayedTributes = isAdmin ? tributes : tributes.filter(t => t.userId === user.id);

    return (
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
                <Link to="/admin/memorials/new" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faPlus} />
                    Add New
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
                                            alt=""
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
                                <td className="px-6 py-4 text-gray-500">
                                    {tribute.dates}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {tribute.createdAt ? new Date(tribute.createdAt).toLocaleDateString() : 'Unknown'}
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
                                            if (window.confirm('Are you sure you want to delete this memorial?')) {
                                                deleteTribute(tribute.id);
                                            }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {displayedTributes.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                    <p className="text-lg">No memorials found.</p>
                                    <p className="text-sm mt-2">Get started by creating your first memorial.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination (Mock) */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-sm text-gray-500">Showing {displayedTributes.length} entries</span>
                <div className="flex gap-1">
                    <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50" disabled>Prev</button>
                    <button className="px-3 py-1 border border-gray-300 rounded bg-primary text-white text-sm">1</button>
                    <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50" disabled>Next</button>
                </div>
            </div>
        </div>
    );
};

export default MemorialsListAdmin;
