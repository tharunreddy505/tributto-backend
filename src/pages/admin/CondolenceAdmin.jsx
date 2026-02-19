import React, { useEffect, useState } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSearch, faCommentDots, faPlus, faEdit } from '@fortawesome/free-solid-svg-icons';

const CondolenceAdmin = () => {
    const { fetchComments, removeComment, updateComment, tributes, addComment } = useTributeContext();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Manual add/edit state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newMsg, setNewMsg] = useState({ tributeId: '', name: '', content: '' });
    const [editingComment, setEditingComment] = useState(null);

    const loadComments = async () => {
        setLoading(true);
        const data = await fetchComments();
        setComments(data);
        setLoading(false);
    };

    useEffect(() => {
        loadComments();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this condolence?')) {
            const success = await removeComment(id);
            if (success) {
                setComments(prev => prev.filter(c => c.id !== id));
            }
        }
    };

    const handleEdit = (comment) => {
        setEditingComment({ ...comment });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingComment.name || !editingComment.content) return;

        const success = await updateComment(editingComment.id, {
            name: editingComment.name,
            content: editingComment.content
        });

        if (success) {
            setShowEditModal(false);
            setEditingComment(null);
            loadComments();
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        if (!newMsg.tributeId || !newMsg.name || !newMsg.content) return;

        await addComment(newMsg.tributeId, {
            name: newMsg.name,
            text: newMsg.content
        });

        setShowAddModal(false);
        setNewMsg({ tributeId: '', name: '', content: '' });
        loadComments();
    };

    const filteredComments = comments.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tribute_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">Add Manual Entry</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                        </div>
                        <form onSubmit={handleManualAdd} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Memorial</label>
                                <select
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={newMsg.tributeId}
                                    onChange={e => setNewMsg({ ...newMsg, tributeId: e.target.value })}
                                    required
                                >
                                    <option value="">-- Choose a Memorial --</option>
                                    {tributes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From (Name)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={newMsg.name}
                                    onChange={e => setNewMsg({ ...newMsg, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary h-32"
                                    value={newMsg.content}
                                    onChange={e => setNewMsg({ ...newMsg, content: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-opacity-90 transition-all">
                                Save Condolence
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingComment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border-t-4 border-primary">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">Edit Condolence</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-medium"
                                    value={editingComment.name}
                                    onChange={e => setEditingComment({ ...editingComment, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary h-32 leading-relaxed"
                                    value={editingComment.content}
                                    onChange={e => setEditingComment({ ...editingComment, content: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-[2] bg-primary text-white py-2 rounded-md font-bold hover:bg-opacity-90 shadow-md transition-all">
                                    Update Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search condolences..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow focus:shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 shrink-0 hover:bg-opacity-90 shadow-sm transition-all"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            Add Entry
                        </button>
                    </div>
                    <div className="text-sm text-gray-500">
                        Total Condolences: <span className="font-bold text-gray-700">{filteredComments.length}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">From</th>
                                <th className="px-6 py-3">Message</th>
                                <th className="px-6 py-3">Memorial</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                            <span>Loading condolences...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredComments.length > 0 ? (
                                filteredComments.map((comment) => (
                                    <tr key={comment.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{comment.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-600 max-w-md line-clamp-2 leading-relaxed">{comment.content}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded-full border border-primary/10">
                                                {comment.tribute_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Edit"
                                                    onClick={() => handleEdit(comment)}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                    onClick={() => handleDelete(comment.id)}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-24 text-center text-gray-400">
                                        <FontAwesomeIcon icon={faCommentDots} size="3x" className="mb-4 opacity-10" />
                                        <p className="text-lg">No condolences found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-sm text-gray-500">Showing {filteredComments.length} entries</span>
                </div>
            </div>
        </div>
    );
};

export default CondolenceAdmin;
