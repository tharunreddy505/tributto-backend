import React, { useEffect, useState, useMemo } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCrown, faCheckCircle, faTimesCircle, faHourglass, faInfinity,
    faSearch, faFilter, faUser, faEnvelope, faCalendarAlt,
    faXmark, faSpinner, faArrowUp, faArrowDown, faBookOpen, faLink,
    faPencil, faTrash, faShieldAlt, faCheck
} from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '../../config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status, hasPaidBefore }) => {
    const isPending = status === 'expired' && !hasPaidBefore;
    const cfg = {
        trial: { label: 'Trial', icon: faHourglass, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
        active: { label: 'Active', icon: faCheckCircle, cls: 'bg-green-50 text-green-700 border-green-100' },
        expired: {
            label: isPending ? 'Pending' : 'Expired',
            icon: isPending ? faHourglass : faTimesCircle,
            cls: isPending ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
        },
    }[status] || { label: 'Active', icon: faCheckCircle, cls: 'bg-green-50 text-green-700 border-green-100' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
            <FontAwesomeIcon icon={cfg.icon} />
            {cfg.label}
        </span>
    );
};

// ─── Date helper ─────────────────────────────────────────────────────────────
const fmt = (d, includeTime = false, showRelative = false) => {
    if (!d) return <span className="text-gray-300">—</span>;
    const date = new Date(d);
    const now = new Date();

    // Check if today
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    let baseStr = isToday && !includeTime ? 'Today' : date.toLocaleDateString('en-GB', options).replace(',', '');

    if (showRelative) {
        const diffInMs = date - now;
        const diffInHours = Math.abs(diffInMs) / (1000 * 60 * 60);
        const diffInDays = diffInHours / 24;
        let rel = '';
        if (diffInMs > 0) {
            if (diffInDays >= 1) rel = `Ends in ${Math.round(diffInDays)} days`;
            else if (diffInHours >= 1) rel = `Ends in ${Math.round(diffInHours)}h`;
            else rel = `Ends soon`;
        } else {
            if (diffInDays >= 1) rel = `Ended ${Math.round(diffInDays)}d ago`;
            else if (diffInHours >= 1) rel = `Ended ${Math.round(diffInHours)}h ago`;
            else rel = `Ended just now`;
        }
        return (
            <div className="flex flex-col">
                <span>{baseStr}</span>
                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter mt-0.5">{rel}</span>
            </div>
        );
    }

    return baseStr;
};

// ─── Sortable TH ─────────────────────────────────────────────────────────────
const Th = ({ children, field, sort, onSort }) => (
    <th
        className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors border-b border-gray-100/50"
        onClick={() => onSort(field)}
    >
        <span className="inline-flex items-center gap-1.5">
            {children}
            {sort.field === field
                ? <FontAwesomeIcon icon={sort.dir === 'asc' ? faArrowUp : faArrowDown} className="text-[10px] text-amber-500" />
                : <FontAwesomeIcon icon={faArrowUp} className="text-[10px] text-gray-100 group-hover:text-gray-200" />}
        </span>
    </th>
);

// ─── Detail Side Panel ────────────────────────────────────────────────────────
const DetailPanel = ({ sub, onClose, onEdit, onDelete }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
        <div
            className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideIn 0.2s ease-out' }}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1d2327] to-[#2c3338] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c59d5f]/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faCrown} className="text-[#c59d5f]" />
                    </div>
                    <div>
                        <p className="text-white font-bold">Subscription #{sub.id}</p>
                        <p className="text-gray-400 text-xs">{sub.username}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                    <StatusBadge status={sub.status} />
                </div>

                {/* Member */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Member</p>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#c59d5f]/10 flex items-center justify-center text-[#c59d5f] font-bold text-sm">
                            {(sub.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm">{sub.username}</p>
                            <a href={`mailto:${sub.email}`} className="text-xs text-gray-400 hover:text-primary flex items-center gap-1">
                                <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                                {sub.email}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Plan */}
                <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</p>
                    <p className="font-semibold text-gray-800">
                        {(sub.status === 'trial' || (sub.status === 'expired' && !sub.paid_start)) ? 'Free Trial' : sub.product_name || '—'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FontAwesomeIcon icon={faInfinity} className="text-amber-400" />
                        {sub.is_lifetime ? 'Lifetime — Never Expires' : (sub.status === 'trial' || (sub.status === 'expired' && !sub.paid_start)) ? 'Trial Period (7 Days)' : '1 Year Subscription'}
                    </div>
                    {sub._virtual && (
                        <div className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded inline-block font-bold">
                            LINKED VIA MEMORIAL
                        </div>
                    )}
                </div>

                {/* Linked Memorials */}
                {sub.memorials_list?.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Created Listings ({sub.memorials_count})</p>
                        <div className="space-y-3">
                            {sub.memorials_list.map((m, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                    {/* Card Header */}
                                    <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">📖 {m.name}</p>
                                            <p className="text-[10px] text-amber-600/70 uppercase font-bold tracking-tighter">ID: #{m.id}</p>
                                        </div>
                                        <a
                                            href={`/memorial/${m.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] text-primary font-bold hover:underline"
                                        >
                                            View Page →
                                        </a>
                                    </div>

                                    {/* Card Dates */}
                                    <div className="p-3 grid grid-cols-2 gap-2">
                                        <div className="bg-gray-50 rounded p-2">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Trial Start</p>
                                            <p className="text-[11px] font-semibold text-gray-600">{fmt(m.trial_start)}</p>
                                        </div>
                                        <div className="bg-blue-50/50 rounded p-2 border border-blue-50">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase">Trial End</p>
                                            <p className="text-[11px] font-bold text-blue-600">{fmt(m.trial_end, true)}</p>
                                        </div>
                                        <div className="bg-green-50/50 rounded p-2 col-span-2 border border-green-50">
                                            <p className="text-[9px] font-bold text-green-600 uppercase">Paid Start / Activation</p>
                                            <p className="text-[11px] font-bold text-green-700">
                                                {m.paid_start ? fmt(m.paid_start) : <span className="text-gray-300 italic">Not yet paid</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* General Subscribed On info */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System Records</p>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 text-xs">Initially Subscribed On</span>
                        <span className="font-semibold text-gray-700 text-xs">{fmt(sub.created_at)}</span>
                    </div>
                </div>

                {/* Payment ref */}
                {sub.stripe_payment_intent_id && (
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stripe Payment Ref</p>
                        <p className="font-mono text-xs text-gray-500 break-all">{sub.stripe_payment_intent_id}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Management</p>
                    <button
                        onClick={() => onEdit(sub)}
                        className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPencil} />
                        {sub._virtual ? 'Create/Edit Record' : 'Edit Subscription'}
                    </button>
                    {(sub.status === 'expired' || sub.status === 'trial') && (
                        <button
                            onClick={() => {
                                showAlert('Send the expiration/reminder email to this user now?', 'warning', 'Confirmation', async () => {
                                    try {
                                        const res = await fetch(`${API_URL}/api/subscriptions/${sub.id}/send-expiry-notice`, {
                                            method: 'POST',
                                            headers: getAuthHeaders()
                                        });
                                        if (res.ok) showToast('Email sent successfully!');
                                        else showAlert('Failed to send email.', 'error');
                                    } catch (e) { showAlert('Error: ' + e.message, 'error'); }
                                });
                            }}
                            className="w-full py-3 rounded-xl border border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faEnvelope} />
                            Resend Expiry Notice
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(sub.id)}
                        className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        {sub._virtual ? 'Delete Memorial' : 'Delete Record'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const SubscriptionsListAdmin = () => {
    const { showAlert, showToast } = useTributeContext();
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedSub, setSelectedSub] = useState(null);
    const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' });

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState(null);
    const [products, setProducts] = useState([]);
    const [updating, setUpdating] = useState(false);

    const fetchSubs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/subscriptions`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (Array.isArray(data)) setSubs(data);
        } catch (e) {
            console.error('Failed to load subscriptions', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            const data = await res.json();
            if (Array.isArray(data)) setProducts(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchSubs();
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        const subToDelete = subs.find(s => s.id === id);
        const msg = subToDelete?._virtual
            ? 'This is a virtual record based on a memorial. Deleting it will delete the memorial itself. Are you sure?'
            : 'Are you sure you want to permanently delete this subscription record? This action cannot be undone.';

        showAlert(msg, 'error', 'Confirm Deletion', async () => {
            try {
                const res = await fetch(`${API_URL}/api/subscriptions/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                const data = await res.json();

                if (res.ok) {
                    setSubs(prev => prev.filter(s => s.id !== id));
                    setSelectedSub(null);
                    showToast("Subscription deleted successfully.");
                } else {
                    showAlert(data.error || 'Failed to delete subscription', 'error');
                }
            } catch (err) {
                console.error(err);
                showAlert('Error connecting to server. Please check your connection.', 'error');
            }
        }, null, "Delete Permanently", "Cancel");
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/${editingSub.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(editingSub)
            });
            if (res.ok) {
                await fetchSubs();
                setIsEditModalOpen(false);
                setSelectedSub(null);
            } else {
                showAlert('Failed to update subscription', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Error updating subscription', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleSort = (field) => {
        setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const filtered = useMemo(() => {
        let rows = [...subs];
        if (filterStatus !== 'all') {
            if (filterStatus === 'lifetime') {
                rows = rows.filter(s => s.is_lifetime);
            } else if (filterStatus === 'pending') {
                rows = rows.filter(s => s.status === 'expired' && !s.paid_start);
            } else if (filterStatus === 'expired') {
                rows = rows.filter(s => s.status === 'expired' && s.paid_start);
            } else {
                rows = rows.filter(s => s.status === filterStatus);
            }
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(s =>
                s.username?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.product_name?.toLowerCase().includes(q)
            );
        }
        rows.sort((a, b) => {
            const av = a[sort.field] ?? '';
            const bv = b[sort.field] ?? '';
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sort.dir === 'asc' ? cmp : -cmp;
        });
        return rows;
    }, [subs, filterStatus, search, sort]);

    // Stats
    const counts = useMemo(() => ({
        total: subs.length,
        trial: subs.filter(s => s.status === 'trial').length,
        active: subs.filter(s => s.status === 'active').length,
        lifetime: subs.filter(s => s.is_lifetime).length,
        pending: subs.filter(s => s.status === 'expired' && !s.paid_start).length,
        expired: subs.filter(s => s.status === 'expired' && s.paid_start).length,
    }), [subs]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <FontAwesomeIcon icon={faCrown} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Subscriptions</h2>
                        <p className="text-xs text-gray-400">Manage all member subscriptions</p>
                    </div>
                </div>
                <div className="text-sm text-gray-400">
                    <span className="font-bold text-gray-700">{filtered.length}</span> of {subs.length} shown
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Trial', count: counts.trial, icon: faHourglass, cls: 'bg-blue-50  text-blue-600', border: 'border-blue-100' },
                    { label: 'Active', count: counts.active, icon: faCheckCircle, cls: 'bg-green-50 text-green-700', border: 'border-green-100' },
                    { label: 'Lifetime', count: counts.lifetime, icon: faInfinity, cls: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
                    { label: 'Pending', count: counts.pending, icon: faHourglass, cls: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Expired', count: counts.expired, icon: faTimesCircle, cls: 'bg-red-50   text-red-500', border: 'border-red-100' },
                ].map(s => (
                    <button
                        key={s.label}
                        onClick={() => setFilterStatus(filterStatus === s.label.toLowerCase() ? 'all' : s.label.toLowerCase())}
                        className={`bg-white rounded-xl border p-4 flex items-center gap-3 text-left hover:shadow-sm transition-all ${s.border} ${filterStatus === s.label.toLowerCase() ? 'ring-2 ring-offset-1 ring-primary/30' : ''}`}
                    >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.cls}`}>
                            <FontAwesomeIcon icon={s.icon} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{s.count}</p>
                            <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                    {/* Search */}
                    <div className="relative">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
                        <input
                            type="text"
                            placeholder="Search member, email or plan…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all w-64"
                        />
                    </div>
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faFilter} className="text-gray-300 text-xs" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-all"
                        >
                            <option value="all">All Statuses</option>
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="lifetime">Lifetime</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
                            <span className="text-sm">Loading subscriptions…</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-white">
                                    <Th field="id" sort={sort} onSort={handleSort}>Subscription</Th>
                                    <Th field="status" sort={sort} onSort={handleSort}>Status</Th>
                                    <Th field="paid_end" sort={sort} onSort={handleSort}>Next Payment</Th>
                                    <Th field="product_name" sort={sort} onSort={handleSort}>Total</Th>
                                    <Th field="trial_start" sort={sort} onSort={handleSort}>Start Date</Th>
                                    <Th field="trial_end" sort={sort} onSort={handleSort}>Trial End</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center text-gray-400 italic text-sm">
                                            No subscriptions found.
                                        </td>
                                    </tr>
                                ) : filtered.map(sub => (
                                    <React.Fragment key={sub.id}>
                                        <tr
                                            className="hover:bg-gray-50/50 transition-all cursor-pointer group border-b border-gray-100"
                                            onClick={() => setSelectedSub(sub)}
                                        >
                                            {/* Subscription / Listing Info */}
                                            <td className="px-5 py-6 whitespace-nowrap">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-600 font-extrabold text-base tracking-tight">
                                                            #{String(sub.id).replace('m-', '')}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200/50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                            <FontAwesomeIcon icon={faUser} className="text-[8px]" />
                                                            {sub.username}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pl-0.5">
                                                        <FontAwesomeIcon icon={faBookOpen} className="text-[10px] text-amber-500/40" />
                                                        <span className="text-[11px] font-bold text-gray-800 tracking-tight">
                                                            {sub.memorial_name || (sub.memorials_list?.[0]?.name) || 'Unnamed Memorial'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-6 whitespace-nowrap">
                                                <StatusBadge status={sub.status} hasPaidBefore={!!sub.paid_start} />
                                            </td>

                                            {/* Next Payment */}
                                            <td className="px-5 py-6 whitespace-nowrap font-bold text-gray-700 text-sm">
                                                {sub.status === 'trial' ? (
                                                    fmt(sub.trial_end, false, true)
                                                ) : sub.is_lifetime ? (
                                                    <span className="text-gray-300">No Renewal (Lifetime)</span>
                                                ) : (
                                                    fmt(sub.paid_end || sub.trial_end, false, sub.status !== 'expired')
                                                )}
                                            </td>

                                            {/* Plan & Total */}
                                            <td className="px-5 py-6">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-gray-900 font-extrabold text-sm uppercase tracking-tight">
                                                        {sub.price ? `€${sub.price}` : 'Free'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">
                                                        {sub.product_name || (sub.is_lifetime ? 'Lifetime Access' : sub.status === 'trial' ? 'Trial Period' : 'Annual Plan')}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Start Date */}
                                            <td className="px-5 py-6 whitespace-nowrap text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {fmt(sub.trial_start || sub.paid_start || sub.created_at)}
                                            </td>

                                            {/* Trial End */}
                                            <td className="px-5 py-6 whitespace-nowrap text-[11px]">
                                                {sub.trial_end ? (
                                                    sub.status === 'active' || sub.paid_start ? (
                                                        <div className="font-bold text-gray-400 line-through" title="Upgraded to Paid">
                                                            {fmt(sub.trial_end, true, false)}
                                                        </div>
                                                    ) : (
                                                        <div className="font-bold text-blue-600/80">
                                                            {fmt(sub.trial_end, true, sub.status === 'trial')}
                                                        </div>
                                                    )
                                                ) : <span className="text-gray-200">N/A</span>}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer count */}
                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 text-xs text-gray-400 flex justify-between">
                        <span>Click any row to view details</span>
                        <span>{filtered.length} subscription{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            {selectedSub && (
                <DetailPanel
                    sub={selectedSub}
                    onClose={() => setSelectedSub(null)}
                    onEdit={(sub) => {
                        setEditingSub({ ...sub });
                        setIsEditModalOpen(true);
                    }}
                    onDelete={handleDelete}
                />
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingSub && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="bg-gray-900 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon icon={faShieldAlt} className="text-amber-400" />
                                <h3 className="font-bold text-lg">Edit Subscription #{editingSub.id}</h3>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                                    <select
                                        value={editingSub.status}
                                        onChange={(e) => setEditingSub({ ...editingSub, status: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none font-bold text-gray-700"
                                    >
                                        <option value="trial">Trial</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Trial End Date</label>
                                    <input
                                        type="date"
                                        value={editingSub.trial_end ? new Date(editingSub.trial_end).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditingSub({ ...editingSub, trial_end: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none font-bold text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Paid End Date</label>
                                    <input
                                        type="date"
                                        value={editingSub.paid_end ? new Date(editingSub.paid_end).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditingSub({ ...editingSub, paid_end: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none font-bold text-gray-700"
                                    />
                                </div>

                                <div className="col-span-2 flex items-center gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <input
                                        type="checkbox"
                                        id="is_lifetime"
                                        checked={editingSub.is_lifetime}
                                        onChange={(e) => setEditingSub({ ...editingSub, is_lifetime: e.target.checked })}
                                        className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <label htmlFor="is_lifetime" className="text-sm font-bold text-amber-800 cursor-pointer flex items-center gap-2">
                                        <FontAwesomeIcon icon={faInfinity} />
                                        Lifetime Access (Never Expires)
                                    </label>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Assign Plan</label>
                                    <select
                                        value={editingSub.product_id || ''}
                                        onChange={(e) => setEditingSub({ ...editingSub, product_id: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none font-bold text-gray-700"
                                    >
                                        <option value="">No Plan (Free/Manual)</option>
                                        {products.filter(p => !p.category || p.category.toLowerCase().includes('subscription') || p.is_lifetime).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - €{p.price}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-100 text-gray-400 font-bold text-sm hover:bg-gray-50 transition-all font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:translate-y-[-2px] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {updating ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SubscriptionsListAdmin;
