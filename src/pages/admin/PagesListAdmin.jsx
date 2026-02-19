import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEye, faSearch, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';

const PagesListAdmin = () => {
    const { pages, deletePage } = useTributeContext();

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                <div className="relative w-full md:w-64">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                </div>
                <Link to="/admin/pages/new" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faPlus} />
                    Add New Page
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Slug</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pages.map((page) => (
                            <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faFileAlt} />
                                        </div>
                                        <span className="font-medium text-gray-900">{page.title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">/{page.slug}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {page.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(page.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <Link
                                        to={`/${page.slug}`}
                                        target="_blank"
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                                        title="View Page"
                                    >
                                        <FontAwesomeIcon icon={faEye} />
                                    </Link>
                                    <Link
                                        to={`/admin/pages/edit/${page.id}`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
                                        title="Edit"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </Link>
                                    <button
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                        title="Delete"
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this page?')) {
                                                deletePage(page.id);
                                            }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {pages.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    <p className="text-lg">No pages found.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-sm text-gray-500">Showing {pages.length} entries</span>
            </div>
        </div>
    );
};

export default PagesListAdmin;
