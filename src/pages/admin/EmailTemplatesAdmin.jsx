
import React, { useState, useEffect } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEnvelope, faEdit, faSave, faTimes, faInfoCircle, faEye,
    faPaperPlane, faSpinner, faClock, faCalendarAlt, faBolt, faHourglass, faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { Editor } from '@tinymce/tinymce-react';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const dummyData = {
    user_name: 'Test Customer',
    order_id_info: 'ORD-12345-TEST',
    memorial_info: 'John Doe Memorial',
    memorial_name: 'John Doe Memorial',
    memorial_link: `${window.location.origin}/memorial/test-memorial`,
    product_name: 'Premium Memorial Package',
    product_price: '€62.70',
    plan_type: 'Annual',
    renew_link: `${window.location.origin}/pricing`,
    payment_link: `${window.location.origin}/checkout`,
    voucher_codes_list: 'VOUCHER-TEST-001',
    header_title: 'Tributoo Test Notification',
    due_date: 'March 1, 2025',
};

const commonEmailHeaderTest = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
    <div style="background: #000; padding: 20px; text-align: center;">
        <img src="https://www.tributoo.com/wp-content/uploads/2025/05/tributoo-icon.png" alt="Tributoo" style="height: 50px;">
        <h1 style="color:#fff; margin:8px 0 0; font-size:22px;">[header_title]</h1>
    </div>
    <div style="padding: 30px; background: #fff;">
`;
const commonEmailFooterTest = `
    </div>
    <div style="background:#f9f9f9;padding:15px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">© Tributoo · Keeping Memories Alive</p>
    </div>
</div>`;

const EmailTemplatesAdmin = () => {
    const { getAuthHeaders, showAlert, showToast } = useTributeContext();
    const [templates, setTemplates] = useState([]);
    const [editingSlug, setEditingSlug] = useState(null);
    const [langVersions, setLangVersions] = useState({}); // { en: {...}, de: {...}, it: {...} }
    const [activeLang, setActiveLang] = useState('en');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    // Shared timing settings (same for all languages)
    const [timingSettings, setTimingSettings] = useState({
        timing_type: 'immediate',
        timing_delay_value: 0,
        timing_delay_unit: 'days',
        timing_reference: 'created_at',
        timing_scheduled_at: '',
        header_enabled: true,
        footer_enabled: true,
    });

    useEffect(() => {
        fetchTemplates();
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.email) setTestEmail(user.email);
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_URL}/api/email-templates`, { headers: getAuthHeaders() });
            const data = await res.json();
            setTemplates(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching templates:', err);
            setLoading(false);
        }
    };

    const handleEdit = async (tpl) => {
        setEditingSlug(tpl.slug);
        setActiveLang('en');
        setShowPreview(false);

        // Shared timing / layout settings from English version
        setTimingSettings({
            timing_type: tpl.timing_type || 'immediate',
            timing_delay_value: tpl.timing_delay_value ?? 0,
            timing_delay_unit: tpl.timing_delay_unit || 'days',
            timing_reference: tpl.timing_reference || 'created_at',
            timing_scheduled_at: tpl.timing_scheduled_at ? tpl.timing_scheduled_at.slice(0, 16) : '',
            header_enabled: tpl.header_enabled !== false,
            footer_enabled: tpl.footer_enabled !== false,
        });

        // Fetch all language versions for this slug
        const versions = {};
        for (const lang of LANGUAGES) {
            try {
                const r = await fetch(`${API_URL}/api/email-templates/${tpl.slug}?lang=${lang.code}`, {
                    headers: getAuthHeaders()
                });
                if (r.ok) {
                    const d = await r.json();
                    versions[lang.code] = { subject: d.subject || '', body: d.body || '', name: d.name || tpl.name };
                } else {
                    // Copy from English as base
                    versions[lang.code] = { subject: tpl.subject || '', body: tpl.body || '', name: tpl.name || '' };
                }
            } catch {
                versions[lang.code] = { subject: tpl.subject || '', body: tpl.body || '', name: tpl.name || '' };
            }
        }
        setLangVersions(versions);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Save each language version separately
            for (const lang of LANGUAGES) {
                const version = langVersions[lang.code];
                if (!version) continue;
                await fetch(`${API_URL}/api/email-templates/${editingSlug}?lang=${lang.code}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({
                        subject: version.subject,
                        body: version.body,
                        name: version.name,
                        language: lang.code,
                        ...timingSettings,
                        timing_scheduled_at: timingSettings.timing_scheduled_at || null,
                    })
                });
            }
            showToast('All language versions saved!', 'success');
            fetchTemplates();
            setTimeout(() => setEditingSlug(null), 1200);
        } catch (err) {
            showAlert('Error saving template.', 'error', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) return showAlert('Please enter an email address', 'warning', 'Invalid Email');
        setSendingTest(true);
        try {
            const res = await fetch(`${API_URL}/api/email-templates/${editingSlug}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ testEmail })
            });
            const data = await res.json();
            if (res.ok) showAlert(`Test email sent to ${testEmail}`, 'success', 'Email Sent');
            else showAlert(`Error: ${data.error}`, 'error', 'Send Failed');
        } catch (err) {
            showAlert(`Error: ${err.message}`, 'error', 'System Error');
        } finally {
            setSendingTest(false);
        }
    };

    const getPreviewHtml = () => {
        const version = langVersions[activeLang];
        if (!version) return '';
        let body = version.body || '';
        let fullHtml = '';
        if (timingSettings.header_enabled) {
            fullHtml += commonEmailHeaderTest.replace('[header_title]', dummyData.header_title);
        }
        fullHtml += body;
        if (timingSettings.footer_enabled) fullHtml += commonEmailFooterTest;
        for (const [key, val] of Object.entries(dummyData)) {
            const regex = new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
            fullHtml = fullHtml.replace(regex, val);
        }
        return fullHtml;
    };

    const updateLang = (field, value) => {
        setLangVersions(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], [field]: value } }));
    };

    if (loading) return <div className="p-8 text-white">Loading email templates...</div>;

    // ── List view ─────────────────────────────────────────────────────────────
    if (!editingSlug) {
        return (
            <div className="p-6 md:p-8 bg-[#1a1a1a] min-h-screen text-white">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
                        <p className="text-gray-400">Customize the automated emails sent to your users in every language.</p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map(tpl => (
                        <div key={tpl.slug} className="bg-[#242424] p-6 rounded-xl border border-gray-800 hover:border-[#c59d5f] transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-gray-800 rounded-lg group-hover:bg-[#c59d5f]/20 transition-colors">
                                    <FontAwesomeIcon icon={faEnvelope} className="text-[#c59d5f] text-xl" />
                                </div>
                                <button onClick={() => handleEdit(tpl)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                            </div>
                            <h3 className="text-xl font-semibold mb-1">{tpl.name}</h3>
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{tpl.subject}</p>
                            {/* Language badges */}
                            <div className="flex gap-1 mb-3">
                                {LANGUAGES.map(l => (
                                    <span key={l.code} className="text-[11px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">{l.flag} {l.code.toUpperCase()}</span>
                                ))}
                            </div>
                            {/* Timing badge */}
                            <div className={`text-[10px] px-2 py-1 rounded w-fit font-bold ${tpl.timing_type === 'delayed' ? 'bg-amber-900/30 text-amber-400' :
                                tpl.timing_type === 'scheduled' ? 'bg-blue-900/30 text-blue-400' :
                                    tpl.timing_type === 'event_only' ? 'bg-purple-900/30 text-purple-400' :
                                        'bg-green-900/30 text-green-400'
                                }`}>
                                {tpl.timing_type === 'immediate' && '⚡ Immediate'}
                                {tpl.timing_type === 'delayed' && `⏳ ${tpl.timing_delay_value}${tpl.timing_delay_unit} after ${tpl.timing_reference}`}
                                {tpl.timing_type === 'scheduled' && '📅 Scheduled'}
                                {tpl.timing_type === 'event_only' && '🔒 Event Only'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Edit view ─────────────────────────────────────────────────────────────
    const currentVersion = langVersions[activeLang] || { subject: '', body: '', name: '' };

    return (
        <div className="p-4 md:p-6 bg-[#1a1a1a] min-h-screen text-white">
            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Left: Editor ── */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Header */}
                        <div className="bg-[#242424] px-6 py-4 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Edit: {currentVersion.name || editingSlug}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">slug: <code className="text-[#c59d5f]">{editingSlug}</code></p>
                            </div>
                            <button type="button" onClick={() => setEditingSlug(null)} className="text-gray-400 hover:text-white transition-colors">
                                <FontAwesomeIcon icon={faTimes} className="text-xl" />
                            </button>
                        </div>

                        {/* Language Tabs */}
                        <div className="bg-[#242424] rounded-xl border border-gray-800 overflow-hidden">
                            <div className="flex border-b border-gray-800">
                                <div className="flex items-center gap-2 px-4 py-3 text-gray-500 text-xs font-bold uppercase border-r border-gray-800">
                                    <FontAwesomeIcon icon={faGlobe} /> Language
                                </div>
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => { setActiveLang(lang.code); setShowPreview(false); }}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeLang === lang.code
                                            ? 'border-[#c59d5f] text-[#c59d5f]'
                                            : 'border-transparent text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <span>{lang.flag}</span> {lang.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Template name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Template Name ({activeLang.toUpperCase()})</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c59d5f] text-sm"
                                        value={currentVersion.name || ''}
                                        onChange={e => updateLang('name', e.target.value)}
                                    />
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Subject Line ({activeLang.toUpperCase()})</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c59d5f]"
                                        value={currentVersion.subject || ''}
                                        onChange={e => updateLang('subject', e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Body */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                                        Email Content — {LANGUAGES.find(l => l.code === activeLang)?.flag} {LANGUAGES.find(l => l.code === activeLang)?.label}
                                    </label>
                                    <Editor
                                        key={`${editingSlug}-${activeLang}`}
                                        apiKey={import.meta.env.VITE_TINYMCE_KEY}
                                        value={currentVersion.body || ''}
                                        init={{
                                            height: 480,
                                            menubar: true,
                                            plugins: [
                                                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons'
                                            ],
                                            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | link image | alignleft aligncenter alignright | numlist bullist | code | help',
                                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background: #fff; color: #333; }',
                                            skin: 'oxide-dark',
                                            content_css: 'dark',
                                            branding: false,
                                            promotion: false
                                        }}
                                        onEditorChange={content => updateLang('body', content)}
                                    />
                                </div>

                                {/* Shortcodes info */}
                                <div className="flex gap-3 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg items-start">
                                    <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-blue-400 font-semibold text-sm mb-1">Available Shortcodes</h4>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {['[user_name]', '[memorial_name]', '[memorial_link]', '[product_price]', '[due_date]', '[payment_link]', '[renew_link]', '[product_name]', '[plan_type]', '[header_title]', '[voucher_codes_list]'].map(sc => (
                                                <code key={sc} className="bg-blue-900/40 text-blue-200 px-2 py-0.5 rounded text-xs select-all cursor-pointer">{sc}</code>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Save buttons */}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="px-5 py-2 rounded-lg border border-[#c59d5f] text-[#c59d5f] hover:bg-[#c59d5f] hover:text-black transition-all font-bold flex items-center gap-2 text-sm"
                                    >
                                        <FontAwesomeIcon icon={faEye} /> {showPreview ? 'Hide Preview' : 'Preview'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-[#c59d5f] text-black font-bold px-8 py-2 rounded-lg hover:bg-[#b38b4d] transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={saving ? faSpinner : faSave} className={saving ? 'animate-spin' : ''} />
                                        {saving ? 'Saving all languages...' : 'Save All Languages'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        {showPreview && (
                            <div className="bg-[#242424] p-5 rounded-xl border border-[#c59d5f]/30">
                                <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faEye} className="text-[#c59d5f]" />
                                    Live Preview — {LANGUAGES.find(l => l.code === activeLang)?.flag} {activeLang.toUpperCase()}
                                    <span className="text-xs text-gray-500 font-normal ml-2">(with dummy data)</span>
                                </h3>
                                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                    <div
                                        style={{ transform: 'scale(0.82)', transformOrigin: 'top center', height: '500px', overflowY: 'auto', padding: '10px' }}
                                        dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right sidebar ── */}
                    <div className="space-y-5">
                        {/* Header/Footer toggles */}
                        <div className="bg-[#242424] p-5 rounded-xl border border-gray-800">
                            <h3 className="text-sm font-bold text-gray-300 uppercase mb-4">Layout</h3>
                            <div className="space-y-3">
                                {[['header_enabled', 'Enable Common Header'], ['footer_enabled', 'Enable Common Footer']].map(([field, label]) => (
                                    <label key={field} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={timingSettings[field] !== false}
                                            onChange={e => setTimingSettings(p => ({ ...p, [field]: e.target.checked }))}
                                            className="w-4 h-4 accent-[#c59d5f]"
                                        />
                                        <span className="text-sm text-gray-300">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Timing Panel */}
                        <div className="bg-[#242424] p-5 rounded-xl border border-gray-800">
                            <h3 className="text-sm font-bold text-gray-300 uppercase mb-1 flex items-center gap-2">
                                <FontAwesomeIcon icon={faClock} className="text-[#c59d5f]" /> Timing
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Controls when this email fires automatically.</p>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Timing Type</label>
                                    <select
                                        value={timingSettings.timing_type}
                                        onChange={e => setTimingSettings(p => ({ ...p, timing_type: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#c59d5f]"
                                    >
                                        <option value="immediate">⚡ Run immediately</option>
                                        <option value="delayed">⏳ Delayed</option>
                                        <option value="scheduled">📅 Scheduled (fixed date)</option>
                                        <option value="event_only">🔒 Event Only (API triggered)</option>
                                    </select>
                                </div>

                                {timingSettings.timing_type === 'delayed' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Delay From</label>
                                            <select
                                                value={timingSettings.timing_reference}
                                                onChange={e => setTimingSettings(p => ({ ...p, timing_reference: e.target.value }))}
                                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c59d5f]"
                                            >
                                                <option value="created_at">Memorial Created</option>
                                                <option value="paid_start">Paid Start</option>
                                                <option value="paid_end">Paid End (renewal date)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Length of Delay</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number" min="0"
                                                    value={timingSettings.timing_delay_value}
                                                    onChange={e => setTimingSettings(p => ({ ...p, timing_delay_value: parseInt(e.target.value) || 0 }))}
                                                    className="w-20 bg-[#1a1a1a] border border-[#c59d5f] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                                />
                                                <select
                                                    value={timingSettings.timing_delay_unit}
                                                    onChange={e => setTimingSettings(p => ({ ...p, timing_delay_unit: e.target.value }))}
                                                    className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c59d5f]"
                                                >
                                                    <option value="minutes">Minutes</option>
                                                    <option value="hours">Hours</option>
                                                    <option value="days">Days</option>
                                                    <option value="weeks">Weeks</option>
                                                </select>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                Sends <strong className="text-amber-400">{timingSettings.timing_delay_value} {timingSettings.timing_delay_unit}</strong> after <strong className="text-amber-400">{timingSettings.timing_reference}</strong>.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {timingSettings.timing_type === 'scheduled' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Send On (Date & Time)</label>
                                        <input
                                            type="datetime-local"
                                            value={timingSettings.timing_scheduled_at || ''}
                                            onChange={e => setTimingSettings(p => ({ ...p, timing_scheduled_at: e.target.value }))}
                                            className="w-full bg-[#1a1a1a] border border-[#c59d5f] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* Status badge */}
                                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg w-fit ${timingSettings.timing_type === 'immediate' ? 'bg-green-900/30 text-green-400' :
                                    timingSettings.timing_type === 'delayed' ? 'bg-amber-900/30 text-amber-400' :
                                        timingSettings.timing_type === 'event_only' ? 'bg-purple-900/30 text-purple-400' :
                                            'bg-blue-900/30 text-blue-400'
                                    }`}>
                                    <FontAwesomeIcon icon={
                                        timingSettings.timing_type === 'immediate' ? faBolt :
                                            timingSettings.timing_type === 'delayed' ? faHourglass : faCalendarAlt
                                    } />
                                    {timingSettings.timing_type === 'immediate' && 'Sends immediately'}
                                    {timingSettings.timing_type === 'delayed' && `After ${timingSettings.timing_delay_value} ${timingSettings.timing_delay_unit}`}
                                    {timingSettings.timing_type === 'scheduled' && (timingSettings.timing_scheduled_at ? `On ${new Date(timingSettings.timing_scheduled_at).toLocaleString()}` : 'Pick a date')}
                                    {timingSettings.timing_type === 'event_only' && 'API event only'}
                                </div>
                            </div>
                        </div>

                        {/* Send Test Email */}
                        <div className="bg-[#242424] p-5 rounded-xl border border-gray-800">
                            <h3 className="text-sm font-bold text-gray-300 uppercase mb-1 flex items-center gap-2">
                                <FontAwesomeIcon icon={faPaperPlane} className="text-[#c59d5f]" /> Send Test
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Sends the <strong className="text-white">{activeLang.toUpperCase()}</strong> version to this email.</p>
                            <div className="space-y-3">
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c59d5f] text-sm"
                                    placeholder="your-email@example.com"
                                />
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={sendingTest}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    <FontAwesomeIcon icon={sendingTest ? faSpinner : faPaperPlane} className={sendingTest ? 'animate-spin' : ''} />
                                    {sendingTest ? 'Sending...' : `Send Test (${activeLang.toUpperCase()})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EmailTemplatesAdmin;
