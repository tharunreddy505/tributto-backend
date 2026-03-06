import React, { useState, useEffect } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faTimes, faSearch, faCalendarAlt, faSyncAlt, faCheckCircle, faExclamationCircle, faEnvelopeOpenText, faRedo, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const EmailLogsAdmin = () => {
    const { getAuthHeaders, showAlert, showToast } = useTributeContext();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLogHtml, setSelectedLogHtml] = useState(null);
    const [selectedQueueItem, setSelectedQueueItem] = useState(null);
    const [loadingHtml, setLoadingHtml] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [retryingIds, setRetryingIds] = useState(new Set());

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const [resLogs, resQueue] = await Promise.all([
                fetch(`${API_URL}/api/email-logs`, { headers: getAuthHeaders() }),
                fetch(`${API_URL}/api/email-queue`, { headers: getAuthHeaders() })
            ]);
            const dataLogs = await resLogs.json();
            const dataQueue = await resQueue.json();

            setLogs([...dataLogs, ...dataQueue]);
        } catch (err) {
            console.error("Error fetching logs:", err);
            showAlert("Failed to load email logs", "error");
        } finally {
            setLoading(false);
        }
    };

    const viewLogHtml = async (id) => {
        if (String(id).startsWith('q_')) {
            showToast("Cannot preview future scheduled emails, as the content is dynamically generated at send time.", "info");
            return;
        }

        setLoadingHtml(true);
        setSelectedLogHtml('loading...');
        try {
            const res = await fetch(`${API_URL}/api/email-logs/${id}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setSelectedLogHtml(data.html_body);
        } catch (err) {
            setSelectedLogHtml('<p>Error loading content.</p>');
        } finally {
            setLoadingHtml(false);
        }
    };

    const retryEmail = async (id) => {
        setRetryingIds(prev => new Set(prev).add(id));
        try {
            const res = await fetch(`${API_URL}/api/email-logs/${id}/retry`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success) {
                showToast("Email re-sent successfully!", "success");
                await fetchLogs();
            } else {
                showToast(data.error || "Failed to re-send email", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to re-send email", "error");
        } finally {
            setRetryingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const deleteLog = async (id) => {
        if (String(id).startsWith('q_')) {
            showToast("Cannot delete scheduled emails directly from here.", "info");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this email log forever?")) return;

        try {
            const res = await fetch(`${API_URL}/api/email-logs/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (res.ok) {
                showToast("Log deleted successfully", "success");
                setLogs(prev => prev.filter(l => l.id !== id));
            } else {
                showToast(data.error || "Failed to delete log", "error");
            }
        } catch (err) {
            console.error("Delete log error:", err);
            showToast("Failed to delete log", "error");
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.recipient_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.template_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.recipient_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const isQueueItem = log.status === 'queued' || log.status === 'overdue';
        const isFailed = log.status === 'failed';

        let matchesTab = false;
        if (activeTab === 'all') matchesTab = !isQueueItem; // all sent & failed
        else if (activeTab === 'queue') matchesTab = isQueueItem;
        else if (activeTab === 'failed') matchesTab = isFailed;

        return matchesSearch && matchesTab;
    });

    const queueCount = logs.filter(l => l.status === 'queued' || l.status === 'overdue').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;

    return (
        <div className="p-6 md:p-8 bg-[#1a1a1a] min-h-screen text-white relative">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Email Logs & Queue</h1>
                    <p className="text-gray-400 text-sm">Review sent emails, failed attempts, and upcoming future scheduled emails.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2.5 bg-[#242424] text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-[#c59d5f] transition-all flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faSyncAlt} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="bg-[#242424] rounded-xl border border-gray-800 flex flex-col h-[calc(100vh-180px)]">

                {/* ── Tabs & Toolbar ── */}
                <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#1f1f1f] rounded-t-xl">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-[#c59d5f] text-black' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Sent Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-[#c59d5f] text-black' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Scheduled Queue {queueCount > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-black/20 text-black' : 'bg-[#c59d5f]/20 text-[#c59d5f]'}`}>{queueCount}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('failed')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Failed {failedCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{failedCount}</span>}
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search email, template, subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#c59d5f] transition-colors"
                        />
                    </div>
                </div>

                {/* ── Table Container ── */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading email logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-12 pl-16 text-center text-gray-500 flex flex-col items-center">
                            <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-5xl mb-4 text-gray-700" />
                            <p>{activeTab === 'queue' ? 'No scheduled upcoming emails in the queue.' : 'No email logs found matching your search.'}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#1f1f1f] sticky top-0 z-10 shadow-sm text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800 w-16">ID</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800 w-24">Status</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800">Workflow / Template</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800">Customer</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800">{activeTab === 'queue' ? 'Scheduled For' : 'Date sent'}</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-800 w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredLogs.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        className={`border-b border-gray-800/50 hover:bg-[#333] transition-colors ${index % 2 === 0 ? 'bg-[#242424]' : 'bg-[#2a2a2a]'}`}
                                    >
                                        <td className="px-6 py-3.5 text-gray-500">#{log.id}</td>

                                        <td className="px-6 py-3.5">
                                            {log.status === 'sent' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-900/30 text-green-400 text-[11px] font-bold">
                                                    <FontAwesomeIcon icon={faCheckCircle} /> Sent
                                                </span>
                                            ) : log.status === 'queued' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-[11px] font-bold">
                                                    <FontAwesomeIcon icon={faCalendarAlt} /> Queued
                                                </span>
                                            ) : log.status === 'overdue' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-[11px] font-bold">
                                                    <FontAwesomeIcon icon={faExclamationCircle} /> Next in queue
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 text-red-400 text-[11px] font-bold" title={log.error_message}>
                                                    <FontAwesomeIcon icon={faExclamationCircle} /> Failed
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <div className="font-semibold text-[#c59d5f]">
                                                {log.template_name || log.template_slug}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                <span className="bg-gray-800 px-1 py-0.5 rounded text-gray-400 uppercase text-[9px] font-bold">{log.language}</span>
                                                {log.subject}
                                            </div>
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <div className="text-gray-200 font-medium">
                                                {log.recipient_name || ''}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {log.recipient_email}
                                            </div>
                                        </td>

                                        <td className="px-6 py-3.5 text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500 text-xs" />
                                                {new Date(log.sent_at).toLocaleString('en-US', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: false
                                                })}
                                            </div>
                                            {log.status === 'failed' && (
                                                <div className="text-[10px] text-red-400 mt-1 truncate max-w-[200px]" title={log.error_message}>
                                                    {log.error_message}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-2">
                                                {log.status !== 'queued' && log.status !== 'overdue' ? (
                                                    <button
                                                        onClick={() => viewLogHtml(log.id)}
                                                        className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-gray-700 text-gray-400 hover:text-[#c59d5f] hover:border-[#c59d5f] transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                                                        title="View Email Content"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} /> View
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setSelectedQueueItem(log)}
                                                        className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-gray-700 text-gray-400 hover:text-[#c59d5f] hover:border-[#c59d5f] transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                                                        title="View Queue Details"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} /> View
                                                    </button>
                                                )}

                                                {log.status === 'failed' && (
                                                    <button
                                                        onClick={() => retryEmail(log.id)}
                                                        disabled={retryingIds.has(log.id)}
                                                        className="px-2.5 py-1.5 rounded bg-blue-900/20 border border-blue-800/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Retry Sending Email"
                                                    >
                                                        <FontAwesomeIcon icon={faRedo} className={retryingIds.has(log.id) ? "animate-spin" : ""} />
                                                        {retryingIds.has(log.id) ? "Retrying..." : "Retry"}
                                                    </button>
                                                )}

                                                {log.status !== 'queued' && log.status !== 'overdue' && (
                                                    <button
                                                        onClick={() => deleteLog(log.id)}
                                                        className="px-2.5 py-1.5 rounded bg-red-900/20 border border-red-800/50 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                                                        title="Delete Email Log"
                                                    >
                                                        <FontAwesomeIcon icon={faTrashAlt} /> Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── View Email Modal ── */}
            {selectedLogHtml !== null && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#242424] rounded-xl border border-[#c59d5f]/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#1a1a1a]">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FontAwesomeIcon icon={faEye} className="text-[#c59d5f]" /> Visual Email Preview
                            </h2>
                            <button
                                onClick={() => setSelectedLogHtml(null)}
                                className="w-8 h-8 rounded-lg bg-[#242424] text-gray-400 hover:text-white border border-gray-700 hover:bg-red-500/20 hover:border-red-500/50 flex items-center justify-center transition-all"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div className="flex-1 bg-white overflow-hidden p-0 relative min-h-[50vh]">
                            {selectedLogHtml === 'loading...' ? (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col">
                                    <FontAwesomeIcon icon={faSyncAlt} className="animate-spin text-3xl mb-3 text-[#c59d5f]" />
                                    <span className="font-bold tracking-widest text-xs uppercase">Loading rendered email...</span>
                                </div>
                            ) : (
                                <iframe
                                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                                    srcDoc={selectedLogHtml}
                                    className="w-full h-[70vh] border-0"
                                    title="Email Preview"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Queue Details Modal ── */}
            {selectedQueueItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-[600px] flex flex-col shadow-2xl overflow-hidden animate-slide-up text-gray-800">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                                Queued event #{selectedQueueItem.id.replace('q_', '')}
                            </h2>
                            <button
                                onClick={() => setSelectedQueueItem(null)}
                                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-all"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-lg" />
                            </button>
                        </div>

                        <div className="p-8 space-y-4 text-[15px]">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-gray-600 min-w-[120px]">Workflow:</span>
                                <span className="text-blue-600 font-medium">{selectedQueueItem.template_name}</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="font-bold text-gray-600 min-w-[120px]">Due to run:</span>
                                <span className="text-gray-800 font-medium">
                                    {new Date(selectedQueueItem.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at ', ' ')}
                                </span>
                            </div>

                            {selectedQueueItem.created_at && (
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-gray-600 min-w-[120px]">Created:</span>
                                    <span className="text-gray-800 font-medium">
                                        {new Date(selectedQueueItem.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at ', ' ')}
                                    </span>
                                </div>
                            )}

                            {selectedQueueItem.subscription_id && (
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-gray-600 min-w-[120px]">Subscription:</span>
                                    <span className="text-blue-600 font-medium">#{selectedQueueItem.subscription_id}</span>
                                </div>
                            )}

                            <div className="flex items-start gap-2">
                                <span className="font-bold text-gray-600 min-w-[120px]">Customer:</span>
                                <span className="text-blue-600 font-medium">{selectedQueueItem.recipient_name} {selectedQueueItem.recipient_email}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                            <button onClick={() => setSelectedQueueItem(null)} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EmailLogsAdmin;
