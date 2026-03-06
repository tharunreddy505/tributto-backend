
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch, faUser, faEdit, faTrash, faTimes, faSave,
    faCheckSquare, faSquare, faUsersGear, faCheckDouble,
    faArrowRight, faXmark, faBolt, faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';

const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'memorials', label: 'Memorials', icon: '🕊️' },
    { id: 'media', label: 'Media Library', icon: '🖼️' },
    { id: 'pages', label: 'Pages', icon: '📄' },
    { id: 'posts', label: 'Posts', icon: '✍️' },
    { id: 'products', label: 'Products', icon: '🛒' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '💳' },
    { id: 'menus', label: 'Menus', icon: '📋' },
    { id: 'condolences', label: 'Condolence Book', icon: '📖' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'settings', label: 'System Settings', icon: '⚙️' },
];

const UsersListAdmin = () => {
    const { showAlert, showToast } = useTributeContext();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    // ── Quick Assign panel state (role-based) ──
    const [qaOpen, setQaOpen] = useState(true);
    const [qaSelectedRole, setQaSelectedRole] = useState('');   // which role to assign to
    const [qaPermissions, setQaPermissions] = useState([]);
    const [qaSaving, setQaSaving] = useState(false);
    const [qaSuccess, setQaSuccess] = useState(null);          // null | { count }

    const roleOptions = [
        { value: 'private', label: 'Private Users', color: 'emerald', icon: '👤' },
        { value: 'company', label: 'Company Users', color: 'blue', icon: '🏢' },
        { value: 'admin', label: 'Admins', color: 'purple', icon: '🛡️' },
        { value: 'superadmin', label: 'Super Admins', color: 'yellow', icon: '⭐' },
    ];

    const handleQaRoleChange = (role) => {
        setQaSelectedRole(role);

        // Load the intersection of permissions for all users in this role
        // so the user sees what is currently active for this role
        if (!role) {
            setQaPermissions([]);
        } else {
            const roleUsers = users.filter(u => u.role === role && !u.is_super_admin);
            if (roleUsers.length > 0) {
                let commonPerms = roleUsers[0].permissions || [];
                if (!Array.isArray(commonPerms)) commonPerms = [];

                for (let i = 1; i < roleUsers.length; i++) {
                    const uPerms = Array.isArray(roleUsers[i].permissions) ? roleUsers[i].permissions : [];
                    commonPerms = commonPerms.filter(p => uPerms.includes(p));
                }
                setQaPermissions([...commonPerms]);
            } else {
                setQaPermissions([]);
            }
        }
        setQaSuccess(null);
    };
    const toggleQaPermission = (permId) => {
        setQaSuccess(null);
        setQaPermissions(prev =>
            prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
        );
    };

    // Apply permissions to ALL users that have qaSelectedRole
    const handleQaSave = async () => {
        if (!qaSelectedRole) return;
        const targets = users.filter(u => u.role === qaSelectedRole && !u.is_super_admin);
        if (targets.length === 0) { showAlert('No users found with this role.', 'info'); return; }
        setQaSaving(true);
        setQaSuccess(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/users/bulk`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userIds: targets.map(u => u.id), permissions: qaPermissions })
            });
            if (res.ok) {
                const updated = await res.json();
                setUsers(prev => prev.map(u => { const upd = updated.find(r => r.id === u.id); return upd ? { ...u, ...upd } : u; }));
                setQaSuccess({ count: targets.length });
                showToast(`Permissions updated for ${targets.length} users`);
                setTimeout(() => setQaSuccess(null), 4000);
            } else {
                const err = await res.json();
                showAlert(err.error || 'Failed to save', 'error');
            }
        } catch (err) { console.error(err); showAlert('An error occurred', 'error'); }
        finally { setQaSaving(false); }
    };


    // ── Bulk selection state ──
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showBulkPanel, setShowBulkPanel] = useState(false);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        changeRole: false, role: 'private',
        changeSuperAdmin: false, is_super_admin: false,
        changePermissions: false, permissions: [],
        permissionMode: 'replace',
    });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.is_super_admin === true;

    const initialNewUser = { username: '', email: '', password: '', role: 'private', is_super_admin: false, permissions: [] };
    const [formData, setFormData] = useState(initialNewUser);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setUsers(await res.json());
        } catch (err) { console.error("Error fetching users:", err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const url = isCreating ? `${API_URL}/api/users` : `${API_URL}/api/users/${formData.id}`;
            const method = isCreating ? 'POST' : 'PUT';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const result = await res.json();
                if (isCreating) setUsers([result, ...users]);
                else {
                    setUsers(users.map(u => u.id === result.id ? result : u));
                    if (result.id === currentUser.id) localStorage.setItem('user', JSON.stringify({ ...currentUser, ...result }));
                }
                showToast(isCreating ? "User created successfully" : "User updated successfully");
                closeModal();
            } else { const e = await res.json(); showAlert(e.error || "Operation failed", "error"); }
        } catch (err) { console.error(err); showAlert("An error occurred", "error"); }
        finally { setSaving(false); }
    };

    const handleDeleteUser = async (id) => {
        showAlert("Are you sure you want to delete this user? This will permanently remove their access and account data.", "error", "Confirm Delete", async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    setUsers(users.filter(u => u.id !== id));
                    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                    showToast("User deleted successfully");
                } else {
                    const e = await res.json();
                    showAlert(e.error || "Failed to delete", "error");
                }
            } catch (err) {
                console.error(err);
                showAlert("An error occurred", "error");
            }
        });
    };

    const closeModal = () => { setEditingUser(null); setIsCreating(false); setFormData(initialNewUser); };
    const openEdit = (user) => { setEditingUser(user); setIsCreating(false); setFormData({ ...user, permissions: user.permissions || [] }); };
    const openCreate = () => { setIsCreating(true); setEditingUser(null); setFormData(initialNewUser); };
    const togglePermission = (permId) => {
        const cur = Array.isArray(formData.permissions) ? formData.permissions : [];
        setFormData({ ...formData, permissions: cur.includes(permId) ? cur.filter(p => p !== permId) : [...cur, permId] });
    };

    const filteredUsers = users.filter(u =>
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Checkboxes ──
    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSelectAll = () => setSelectedIds(selectedIds.size === filteredUsers.length ? new Set() : new Set(filteredUsers.map(u => u.id)));
    const allSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    const closeBulkPanel = () => {
        setShowBulkPanel(false);
        setBulkForm({ changeRole: false, role: 'private', changeSuperAdmin: false, is_super_admin: false, changePermissions: false, permissions: [], permissionMode: 'replace' });
    };
    const toggleBulkPermission = (permId) => setBulkForm(prev => {
        const perms = Array.isArray(prev.permissions) ? prev.permissions : [];
        return { ...prev, permissions: perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId] };
    });

    const handleBulkApply = async () => {
        if (selectedIds.size === 0) return;
        const payload = { userIds: Array.from(selectedIds) };
        if (bulkForm.changeRole) payload.role = bulkForm.role;
        if (bulkForm.changeSuperAdmin) payload.is_super_admin = bulkForm.is_super_admin;

        if (bulkForm.changePermissions) {
            if (bulkForm.permissionMode === 'replace') {
                payload.permissions = bulkForm.permissions;
            } else {
                const affectedUsers = users.filter(u => selectedIds.has(u.id));
                const merged = affectedUsers.map(u => {
                    const cur = Array.isArray(u.permissions) ? u.permissions : [];
                    return {
                        id: u.id,
                        permissions: bulkForm.permissionMode === 'add'
                            ? Array.from(new Set([...cur, ...bulkForm.permissions]))
                            : cur.filter(p => !bulkForm.permissions.includes(p))
                    };
                });
                setBulkApplying(true);
                try {
                    const token = localStorage.getItem('token');
                    const results = await Promise.all(merged.map(({ id, permissions }) =>
                        fetch(`${API_URL}/api/users/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ permissions, ...(bulkForm.changeRole ? { role: bulkForm.role } : {}), ...(bulkForm.changeSuperAdmin ? { is_super_admin: bulkForm.is_super_admin } : {}) })
                        }).then(r => r.json())
                    ));
                    setUsers(prev => prev.map(u => { const upd = results.find(r => r.id === u.id); return upd ? { ...u, ...upd } : u; }));
                    setSelectedIds(new Set()); closeBulkPanel();
                    showToast("Bulk update completed successfully");
                } catch (err) { showAlert("Bulk update error", "error"); }
                finally { setBulkApplying(false); }
                return;
            }
        }

        if (Object.keys(payload).length <= 1) { showAlert("Choose at least one field to change.", "info"); return; }

        setBulkApplying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/users/bulk`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
            if (res.ok) {
                const updatedUsers = await res.json();
                setUsers(prev => prev.map(u => { const upd = updatedUsers.find(r => r.id === u.id); return upd ? { ...u, ...upd } : u; }));
                setSelectedIds(new Set()); closeBulkPanel();
                showToast("Bulk update applied successfully");
            } else { const e = await res.json(); showAlert(e.error || "Bulk update failed", "error"); }
        } catch (err) { showAlert("An error occurred.", "error"); }
        finally { setBulkApplying(false); }
    };


    return (
        <div className="space-y-4">

            {/* ══════════════════════════════════════════
                QUICK ASSIGN PANEL
            ══════════════════════════════════════════ */}
            {isSuperAdmin && (
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-xl shadow-xl overflow-hidden">

                    {/* Header */}
                    <button
                        onClick={() => setQaOpen(!qaOpen)}
                        className="w-full flex items-center justify-between px-6 py-4 text-white hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center shadow-lg">
                                <FontAwesomeIcon icon={faBolt} className="text-indigo-900 text-sm" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white leading-tight">Quick Assign Permissions by Role</p>
                                <p className="text-indigo-300 text-xs">Select a role → toggle options → save to ALL users of that role at once</p>
                            </div>
                        </div>
                        <FontAwesomeIcon icon={qaOpen ? faChevronUp : faChevronDown} className="text-indigo-300 text-sm" />
                    </button>

                    {qaOpen && (
                        <div className="px-6 pb-6 space-y-5">

                            {/* ── Role Dropdown ── */}
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                                    Select Role
                                </label>
                                <div className="relative">
                                    <select
                                        value={qaSelectedRole}
                                        onChange={(e) => handleQaRoleChange(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3 bg-white/10 border border-white/20 text-white rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all appearance-none cursor-pointer text-sm"
                                    >
                                        <option value="" className="bg-indigo-900 text-gray-300">— Select a role to assign permissions —</option>
                                        {roleOptions.map(opt => {
                                            const count = users.filter(u => u.role === opt.value && !u.is_super_admin).length;
                                            return (
                                                <option key={opt.value} value={opt.value} className="bg-indigo-900 text-white">
                                                    {opt.icon}  {opt.label}  ({count} {count === 1 ? 'user' : 'users'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs" />
                                </div>

                                {/* Selected role info card */}
                                {qaSelectedRole && (() => {
                                    const roleInfo = roleOptions.find(r => r.value === qaSelectedRole);
                                    const roleUsers = users.filter(u => u.role === qaSelectedRole && !u.is_super_admin);
                                    return (
                                        <div className="mt-3 p-4 bg-white/10 rounded-xl border border-white/15">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{roleInfo.icon}</span>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{roleInfo.label}</p>
                                                        <p className="text-indigo-300 text-xs">
                                                            {roleUsers.length === 0
                                                                ? 'No users with this role'
                                                                : `Permissions will be applied to ${roleUsers.length} user${roleUsers.length !== 1 ? 's' : ''}`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex -space-x-2">
                                                    {roleUsers.slice(0, 5).map(u => (
                                                        <div key={u.id} className="w-7 h-7 rounded-full bg-yellow-400 border-2 border-indigo-800 flex items-center justify-center text-indigo-900 font-bold text-[10px]" title={u.username}>
                                                            {u.username.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {roleUsers.length > 5 && (
                                                        <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-indigo-800 flex items-center justify-center text-white text-[9px] font-bold">
                                                            +{roleUsers.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* ── Permissions grid (shown once role is picked) ── */}
                            {qaSelectedRole && (
                                <>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                                Accessible Options
                                                <span className="ml-2 text-yellow-400">({qaPermissions.length}/{availablePermissions.length} selected)</span>
                                            </label>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { setQaPermissions(availablePermissions.map(p => p.id)); setQaSuccess(null); }}
                                                    className="text-[11px] text-yellow-400 font-bold hover:text-yellow-300 transition-colors"
                                                >
                                                    Select All
                                                </button>
                                                <span className="text-indigo-600">·</span>
                                                <button
                                                    onClick={() => { setQaPermissions([]); setQaSuccess(null); }}
                                                    className="text-[11px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {availablePermissions.map(item => {
                                                const active = qaPermissions.includes(item.id);
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => toggleQaPermission(item.id)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${active
                                                            ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-300 shadow-sm'
                                                            : 'bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-base leading-none">{item.icon}</span>
                                                        <span className="text-xs font-semibold leading-tight flex-1">{item.label}</span>
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${active ? 'bg-yellow-400 border-yellow-400' : 'border-indigo-500'}`}>
                                                            {active && <span className="text-indigo-900 text-[8px] font-black leading-none">✓</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Save button */}
                                    <div className="flex items-center gap-4 pt-1">
                                        <button
                                            onClick={handleQaSave}
                                            disabled={qaSaving || users.filter(u => u.role === qaSelectedRole && !u.is_super_admin).length === 0}
                                            className="flex items-center gap-2 px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-sm rounded-xl transition-all shadow-lg shadow-yellow-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {qaSaving
                                                ? <div className="w-4 h-4 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin"></div>
                                                : <FontAwesomeIcon icon={faSave} />
                                            }
                                            {qaSaving
                                                ? 'Saving...'
                                                : `Apply to ${users.filter(u => u.role === qaSelectedRole && !u.is_super_admin).length} User${users.filter(u => u.role === qaSelectedRole && !u.is_super_admin).length !== 1 ? 's' : ''}`
                                            }
                                        </button>

                                        {qaSuccess && (
                                            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                                                <span>✅</span>
                                                Applied to {qaSuccess.count} user{qaSuccess.count !== 1 ? 's' : ''} successfully!
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {!qaSelectedRole && (
                                <div className="text-center py-4 text-indigo-400/60 text-sm">
                                    <FontAwesomeIcon icon={faUsersGear} className="text-2xl mb-2 opacity-30" />
                                    <p>Select a role from the dropdown above to assign permissions to all users of that role</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════
                USER TABLE CARD
            ══════════════════════════════════════════ */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden relative">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                    <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                        <div className="relative w-full md:w-64">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text" placeholder="Search users..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            />
                        </div>
                        {isSuperAdmin && (
                            <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all whitespace-nowrap">
                                <FontAwesomeIcon icon={faUser} className="text-xs" />
                                Add New User
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 && (
                            <button onClick={() => setShowBulkPanel(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-all shadow-md">
                                <FontAwesomeIcon icon={faUsersGear} />
                                Bulk Edit ({selectedIds.size})
                            </button>
                        )}
                        <div className="text-sm text-gray-500">Total Users: <strong>{users.length}</strong></div>
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-6 py-2 bg-indigo-50 border-b border-indigo-100 text-sm text-indigo-700">
                        <FontAwesomeIcon icon={faCheckDouble} />
                        <span><strong>{selectedIds.size}</strong> user{selectedIds.size !== 1 ? 's' : ''} selected</span>
                        <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1">
                            <FontAwesomeIcon icon={faXmark} /> Clear selection
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <button onClick={toggleSelectAll} className={`text-lg transition-colors ${allSelected ? 'text-indigo-600' : someSelected ? 'text-indigo-400' : 'text-gray-300'}`}>
                                        <FontAwesomeIcon icon={allSelected || someSelected ? faCheckSquare : faSquare} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 w-12">ID</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Permissions</th>
                                <th className="px-4 py-3">Joined</th>
                                <th className="px-4 py-3 w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-400">Loading users...</td></tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => {
                                    const isSelected = selectedIds.has(user.id);
                                    const perms = Array.isArray(user.permissions) ? user.permissions : [];
                                    return (
                                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}>
                                            <td className="px-4 py-4">
                                                <button onClick={() => toggleSelect(user.id)} className={`text-lg transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-200 hover:text-gray-400'}`}>
                                                    <FontAwesomeIcon icon={isSelected ? faCheckSquare : faSquare} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-gray-400">#{user.id}</td>
                                            <td className="px-4 py-4 font-medium text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                                                        {(user.username || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{user.username}</span>
                                                        {user.is_super_admin && <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Super Admin</span>}
                                                        <Link
                                                            to={`/author/${user.username}`}
                                                            target="_blank"
                                                            className="text-[10px] text-[#D4AF37] hover:underline font-medium"
                                                        >
                                                            View Profile →
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">{user.email}</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'admin' || user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {user.is_super_admin ? (
                                                    <span className="text-xs text-purple-600 font-bold">Full Access</span>
                                                ) : perms.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                        {perms.slice(0, 3).map(p => {
                                                            const info = availablePermissions.find(ap => ap.id === p);
                                                            return <span key={p} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{info?.label || p}</span>;
                                                        })}
                                                        {perms.length > 3 && <span className="text-[10px] text-gray-400 px-1">+{perms.length - 3} more</span>}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-gray-400 italic">No permissions</span>
                                                        {isSuperAdmin && (
                                                            <button
                                                                onClick={() => { setQaOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold underline transition-colors"
                                                                title="Quick assign permissions"
                                                            >
                                                                Assign ↑
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1">
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => { setQaOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                            className="text-gray-400 hover:text-yellow-500 transition-colors p-2"
                                                            title="Quick Assign Permissions"
                                                        >
                                                            <FontAwesomeIcon icon={faBolt} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(user)} className="text-gray-400 hover:text-primary transition-colors p-2" title="Edit User">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    {isSuperAdmin && user.id !== currentUser.id && (
                                                        <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2" title="Delete User">
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-400">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ Individual Edit / Create Modal ══ */}
            {(editingUser || isCreating) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{isCreating ? 'Add New User' : 'Manage Access'}</h3>
                                <p className="text-sm text-gray-500">{isCreating ? 'Create a manual account with specific permissions' : `User: ${formData.username} (${formData.email})`}</p>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2"><FontAwesomeIcon icon={faTimes} className="text-xl" /></button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                    <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-primary outline-none text-sm" placeholder="johndoe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-primary outline-none text-sm" placeholder="john@example.com" />
                                </div>
                                {isCreating && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporary Password</label>
                                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-primary outline-none text-sm" placeholder="••••••••" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-primary outline-none">
                                        <option value="private">Private User</option>
                                        <option value="company">Company User</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Superadmin</option>
                                    </select>
                                </div>
                                {isSuperAdmin && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Account Level</label>
                                        <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg border border-purple-100">
                                            <button onClick={() => setFormData({ ...formData, is_super_admin: !formData.is_super_admin })} className={`text-2xl transition-colors ${formData.is_super_admin ? 'text-purple-600' : 'text-gray-300'}`}>
                                                <FontAwesomeIcon icon={formData.is_super_admin ? faCheckSquare : faSquare} />
                                            </button>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-purple-900 leading-tight">Super Admin</span>
                                                <span className="text-[10px] text-purple-600">Full access to all system options</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`space-y-4 ${formData.is_super_admin ? 'opacity-30 pointer-events-none' : ''}`}>
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">Accessible Options</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {availablePermissions.map(item => (
                                        <div key={item.id} onClick={() => togglePermission(item.id)} className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${formData.permissions?.includes(item.id) ? 'bg-primary/5 border-primary text-gray-900 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                            <span>{item.icon}</span>
                                            <FontAwesomeIcon icon={formData.permissions?.includes(item.id) ? faCheckSquare : faSquare} className={formData.permissions?.includes(item.id) ? 'text-primary' : 'text-gray-200'} />
                                            <span className="text-xs font-medium">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                                {formData.is_super_admin && <p className="text-xs text-purple-600 font-medium bg-purple-50 p-3 rounded-lg italic">Super Admin bypasses individual permissions — all options accessible.</p>}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                            <button onClick={closeModal} className="px-6 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="px-8 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FontAwesomeIcon icon={faSave} />}
                                {isCreating ? 'Create User' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Bulk Edit Panel ══ */}
            {showBulkPanel && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeBulkPanel(); }}>
                    <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2"><FontAwesomeIcon icon={faUsersGear} /> Bulk Edit Users</h3>
                                <p className="text-indigo-200 text-sm mt-0.5">Applies to <strong>{selectedIds.size}</strong> selected user{selectedIds.size !== 1 ? 's' : ''}</p>
                            </div>
                            <button onClick={closeBulkPanel} className="text-indigo-200 hover:text-white p-2"><FontAwesomeIcon icon={faTimes} className="text-xl" /></button>
                        </div>

                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Selected Users</p>
                            <div className="flex flex-wrap gap-2">
                                {users.filter(u => selectedIds.has(u.id)).map(u => (
                                    <span key={u.id} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                        <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{u.username.charAt(0).toUpperCase()}</span>
                                        {u.username}
                                        <button onClick={() => toggleSelect(u.id)} className="text-indigo-400 hover:text-indigo-700 ml-0.5"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 flex-1 space-y-6">
                            {[
                                { key: 'changeRole', color: 'indigo', title: 'Change Role', desc: 'Apply same role to all selected users' },
                            ].map(({ key, color, title, desc }) => (
                                <div key={key} className={`rounded-xl border-2 transition-all ${bulkForm[key] ? `border-${color}-400 bg-${color}-50` : 'border-gray-100 bg-white'}`}>
                                    <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setBulkForm(prev => ({ ...prev, [key]: !prev[key] }))}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${bulkForm[key] ? `bg-${color}-600 border-${color}-600` : 'border-gray-300'}`}>
                                            {bulkForm[key] && <span className="text-white text-[8px] font-black">✓</span>}
                                        </div>
                                        <div><p className="text-sm font-bold text-gray-800">{title}</p><p className="text-xs text-gray-500">{desc}</p></div>
                                    </div>
                                    {key === 'changeRole' && bulkForm.changeRole && (
                                        <div className="px-4 pb-4">
                                            <select value={bulkForm.role} onChange={(e) => setBulkForm(prev => ({ ...prev, role: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-indigo-200 outline-none text-sm">
                                                <option value="private">Private User</option>
                                                <option value="company">Company User</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">Superadmin</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isSuperAdmin && (
                                <div className={`rounded-xl border-2 transition-all ${bulkForm.changeSuperAdmin ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white'}`}>
                                    <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setBulkForm(prev => ({ ...prev, changeSuperAdmin: !prev.changeSuperAdmin }))}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${bulkForm.changeSuperAdmin ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                            {bulkForm.changeSuperAdmin && <span className="text-white text-[8px] font-black">✓</span>}
                                        </div>
                                        <div><p className="text-sm font-bold text-gray-800">Change Super Admin Status</p><p className="text-xs text-gray-500">Grant or revoke super admin for all selected</p></div>
                                    </div>
                                    {bulkForm.changeSuperAdmin && (
                                        <div className="px-4 pb-4 flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sa" checked={bulkForm.is_super_admin === true} onChange={() => setBulkForm(p => ({ ...p, is_super_admin: true }))} className="accent-purple-600" /><span className="text-sm text-purple-800 font-medium">Enable</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sa" checked={bulkForm.is_super_admin === false} onChange={() => setBulkForm(p => ({ ...p, is_super_admin: false }))} className="accent-purple-600" /><span className="text-sm text-gray-600 font-medium">Disable</span></label>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={`rounded-xl border-2 transition-all ${bulkForm.changePermissions ? 'border-teal-400 bg-teal-50' : 'border-gray-100 bg-white'}`}>
                                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setBulkForm(prev => ({ ...prev, changePermissions: !prev.changePermissions }))}>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${bulkForm.changePermissions ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                                        {bulkForm.changePermissions && <span className="text-white text-[8px] font-black">✓</span>}
                                    </div>
                                    <div><p className="text-sm font-bold text-gray-800">Change Permissions</p><p className="text-xs text-gray-500">Set, add or remove permissions for all selected</p></div>
                                </div>
                                {bulkForm.changePermissions && (
                                    <div className="px-4 pb-4 space-y-3">
                                        <div className="flex rounded-lg border border-teal-200 overflow-hidden">
                                            {['replace', 'add', 'remove'].map(m => (
                                                <button key={m} onClick={() => setBulkForm(p => ({ ...p, permissionMode: m }))} className={`flex-1 py-1.5 text-xs font-bold transition-all capitalize ${bulkForm.permissionMode === m ? 'bg-teal-600 text-white' : 'bg-white text-gray-500 hover:bg-teal-50'}`}>{m}</button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBulkForm(p => ({ ...p, permissions: availablePermissions.map(x => x.id) }))} className="text-[11px] text-teal-600 font-bold hover:underline">Select All</button>
                                            <span className="text-gray-300">·</span>
                                            <button onClick={() => setBulkForm(p => ({ ...p, permissions: [] }))} className="text-[11px] text-gray-500 hover:underline">Clear</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availablePermissions.map(item => {
                                                const active = bulkForm.permissions.includes(item.id);
                                                return (
                                                    <div key={item.id} onClick={() => toggleBulkPermission(item.id)} className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${active ? 'bg-teal-500 border-teal-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                                                        <span>{item.icon}</span>
                                                        <span className="text-xs font-medium">{item.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                            <button onClick={closeBulkPanel} className="px-5 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={handleBulkApply} disabled={bulkApplying || (!bulkForm.changeRole && !bulkForm.changeSuperAdmin && !bulkForm.changePermissions)} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200">
                                {bulkApplying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FontAwesomeIcon icon={faArrowRight} />}
                                Apply to {selectedIds.size} User{selectedIds.size !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersListAdmin;
