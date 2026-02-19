import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrash, faSave, faImage, faFont, faCode,
    faCheck, faStar, faAlignCenter, faAlignLeft, faAlignRight,
    faTimes, faLock, faUnlock, faEye, faEyeSlash, faCopy
} from '@fortawesome/free-solid-svg-icons';

import { API_URL } from '../../config';

const API = API_URL;

const SHORTCODES = [
    { code: '[voucher_code]', label: 'Voucher Code', preview: 'A3F9B2C1', color: '#D4AF37' },
    { code: '[voucher_value]', label: 'Voucher Value', preview: '€50.00', color: '#D4AF37' },
    { code: '[product_name]', label: 'Product Name', preview: 'Tributoo Memorial Page', color: '#ffffff' },
    { code: '[customer_name]', label: 'Customer Name', preview: 'Max Mustermann', color: '#ffffff' },
    { code: '[customer_email]', label: 'Customer Email', preview: 'max@example.com', color: '#aaaaaa' },
    { code: '[recipient_message]', label: 'Personal Message', preview: 'Dear Customer, enjoy your Tributoo experience!', color: '#cccccc' },
    { code: '[expiry_date]', label: 'Expiry Date', preview: '18.02.2027', color: '#aaaaaa' },
    { code: '[order_date]', label: 'Order Date', preview: '18.02.2026', color: '#aaaaaa' },
];

const PREVIEW_MAP = Object.fromEntries(SHORTCODES.map(s => [s.code, s.preview]));

const applyPreview = (text) => {
    let result = text || '';
    for (const [key, val] of Object.entries(PREVIEW_MAP)) result = result.split(key).join(val);
    return result;
};

const makeEl = (type, code) => ({
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    content: code || (type === 'shortcode' ? '[voucher_code]' : 'New Text'),
    x: 50,
    y: 50,
    fontSize: type === 'shortcode' ? 20 : 13,
    fontWeight: type === 'shortcode' ? 'bold' : 'normal',
    color: SHORTCODES.find(s => s.code === code)?.color || (type === 'shortcode' ? '#D4AF37' : '#ffffff'),
    align: 'center',
    width: 70,
    visible: true,
    locked: false,
});

// A4 ratio canvas
const CANVAS_W = 420;
const CANVAS_H = Math.round(CANVAS_W * (841.89 / 595.28)); // 594px

export default function VoucherTemplateAdmin() {
    const [templates, setTemplates] = useState([]);
    const [tpl, setTpl] = useState(null);       // current template being edited
    const [activeId, setActiveId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const canvasRef = useRef(null);
    const drag = useRef(null);
    const bgRef = useRef();
    const logoRef = useRef();
    const token = localStorage.getItem('token');

    useEffect(() => { load(); }, []);

    // ── Data ──────────────────────────────────────────────────────────────────
    const parseEls = (els) => {
        if (Array.isArray(els)) return els;
        try { return JSON.parse(els || '[]'); } catch { return []; }
    };

    const load = async () => {
        try {
            const res = await fetch(`${API}/api/voucher-templates`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setTemplates(data);
            if (data.length > 0 && !tpl) openTpl(data[0]);
        } catch (e) { console.error(e); }
    };

    const openTpl = (t) => {
        let els = parseEls(t.elements);
        // Auto-fix: Deduplicate [recipient_message] if multiple exist (keep the last one)
        const msgEls = els.filter(e => e.content === '[recipient_message]');
        if (msgEls.length > 1) {
            const keep = msgEls[msgEls.length - 1];
            els = els.filter(e => e.content !== '[recipient_message]' || e === keep);
        }
        setTpl({ ...t, elements: els });
        setActiveId(null);
    };

    const newTpl = () => {
        setTpl({ id: null, name: 'New Template', background_color: '#1a1a1a', background_image: null, logo_url: null, elements: [], is_default: false });
        setActiveId(null);
    };

    const save = async () => {
        setSaving(true);
        const method = tpl.id ? 'PUT' : 'POST';
        const url = tpl.id ? `${API}/api/voucher-templates/${tpl.id}` : `${API}/api/voucher-templates`;
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(tpl),
            });
            const data = await res.json();
            setTpl({ ...data, elements: parseEls(data.elements) });
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2500);
            load();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const deleteTpl = async () => {
        if (!tpl?.id || !confirm('Delete this template?')) return;
        await fetch(`${API}/api/voucher-templates/${tpl.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setTpl(null);
        load();
    };

    // ── Elements ──────────────────────────────────────────────────────────────
    const addShortcode = (sc) => {
        const el = makeEl('shortcode', sc.code);
        el.color = sc.color;
        setTpl(p => ({ ...p, elements: [...p.elements, el] }));
        setActiveId(el.id);
    };

    const addText = () => {
        const el = makeEl('text');
        setTpl(p => ({ ...p, elements: [...p.elements, el] }));
        setActiveId(el.id);
    };

    const upd = (id, changes) => {
        setTpl(p => ({ ...p, elements: p.elements.map(e => e.id === id ? { ...e, ...changes } : e) }));
    };

    const del = (id) => {
        setTpl(p => ({ ...p, elements: p.elements.filter(e => e.id !== id) }));
        if (activeId === id) setActiveId(null);
    };

    const dup = (id) => {
        const src = tpl.elements.find(e => e.id === id);
        if (!src) return;
        const clone = { ...src, id: `el_${Date.now()}`, x: src.x + 2, y: src.y + 2 };
        setTpl(p => ({ ...p, elements: [...p.elements, clone] }));
        setActiveId(clone.id);
    };

    // ── Drag & Drop on Canvas ─────────────────────────────────────────────────
    const onMouseDown = useCallback((e, id) => {
        e.preventDefault();
        e.stopPropagation();
        const el = tpl.elements.find(el => el.id === id);
        if (!el || el.locked) return;
        setActiveId(id);
        const rect = canvasRef.current.getBoundingClientRect();
        drag.current = { id, startMX: e.clientX, startMY: e.clientY, origX: el.x, origY: el.y, rect };
    }, [tpl]);

    const onMouseMove = useCallback((e) => {
        if (!drag.current) return;
        const { id, startMX, startMY, origX, origY, rect } = drag.current;
        const dx = ((e.clientX - startMX) / rect.width) * 100;
        const dy = ((e.clientY - startMY) / rect.height) * 100;
        const nx = Math.max(0, Math.min(100, origX + dx));
        const ny = Math.max(0, Math.min(100, origY + dy));
        setTpl(p => ({
            ...p,
            elements: p.elements.map(el => el.id === id
                ? { ...el, x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 }
                : el)
        }));
    }, []);

    const onMouseUp = useCallback(() => { drag.current = null; }, []);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    // ── File Uploads ──────────────────────────────────────────────────────────
    const handleFile = (key) => (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setTpl(p => ({ ...p, [key]: ev.target.result }));
        reader.readAsDataURL(file);
    };

    const activeEl = tpl?.elements?.find(e => e.id === activeId);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* ── Top Bar ── */}
            <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>🎫 Voucher Template Designer</span>
                    {tpl && (
                        <input value={tpl.name} onChange={e => setTpl(p => ({ ...p, name: e.target.value }))}
                            style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 13, outline: 'none', width: 200 }} />
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* Template selector */}
                    <select onChange={e => { const t = templates.find(t => t.id == e.target.value); if (t) openTpl(t); }}
                        value={tpl?.id || ''}
                        style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none' }}>
                        <option value="">— Select Template —</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.is_default ? '⭐ ' : ''}{t.name}</option>)}
                    </select>
                    <button onClick={newTpl} style={topBtn('#1e1e1e', '#ccc')}>+ New</button>
                    {tpl && <>
                        <button onClick={save} disabled={saving} style={topBtn(savedOk ? '#16a34a' : '#D4AF37', savedOk ? '#fff' : '#000', true)}>
                            <FontAwesomeIcon icon={savedOk ? faCheck : faSave} /> {saving ? 'Saving…' : savedOk ? 'Saved!' : 'Save'}
                        </button>
                    </>}
                </div>
            </div>

            {tpl ? (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ── Left Sidebar: Shortcode Palette ── */}
                    <div style={{ width: 220, background: '#111', borderRight: '1px solid #1e1e1e', overflowY: 'auto', padding: 16, flexShrink: 0 }}>
                        <p style={secLabel}>Add to Canvas</p>

                        <button onClick={addText} style={paletteBtn('#1e1e1e', '#fff')}>
                            <FontAwesomeIcon icon={faFont} style={{ color: '#888' }} /> Custom Text
                        </button>

                        <p style={{ ...secLabel, marginTop: 16 }}>Dynamic Shortcodes</p>
                        <p style={{ fontSize: 10, color: '#444', marginBottom: 10, lineHeight: 1.5 }}>
                            Click to add, then drag on canvas to position
                        </p>
                        {SHORTCODES.map(sc => (
                            <button key={sc.code} onClick={() => addShortcode(sc)} style={paletteBtn('#1a1a1a', sc.color)}>
                                <FontAwesomeIcon icon={faCode} style={{ fontSize: 10, opacity: 0.6 }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600 }}>{sc.label}</div>
                                    <div style={{ fontSize: 9, opacity: 0.5, fontFamily: 'monospace' }}>{sc.code}</div>
                                </div>
                            </button>
                        ))}

                        <p style={{ ...secLabel, marginTop: 20 }}>Background</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="color" value={tpl.background_color || '#1a1a1a'}
                                    onChange={e => setTpl(p => ({ ...p, background_color: e.target.value }))}
                                    style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
                                <input value={tpl.background_color || '#1a1a1a'}
                                    onChange={e => setTpl(p => ({ ...p, background_color: e.target.value }))}
                                    style={{ ...smallInput, fontFamily: 'monospace', flex: 1 }} />
                            </div>
                            <input type="file" accept="image/*" ref={bgRef} onChange={handleFile('background_image')} style={{ display: 'none' }} />
                            <button onClick={() => bgRef.current.click()} style={paletteBtn('#1e1e1e', '#ccc')}>
                                <FontAwesomeIcon icon={faImage} /> {tpl.background_image ? 'Change BG Image' : 'Upload BG Image'}
                            </button>
                            {tpl.background_image && (
                                <button onClick={() => setTpl(p => ({ ...p, background_image: null }))} style={paletteBtn('#1a0a0a', '#f87171')}>
                                    <FontAwesomeIcon icon={faTimes} /> Remove BG Image
                                </button>
                            )}

                            <input type="file" accept="image/*" ref={logoRef} onChange={handleFile('logo_url')} style={{ display: 'none' }} />
                            <button onClick={() => logoRef.current.click()} style={paletteBtn('#1e1e1e', '#ccc')}>
                                <FontAwesomeIcon icon={faImage} /> {tpl.logo_url ? 'Change Logo' : 'Upload Logo'}
                            </button>
                            {tpl.logo_url && (
                                <button onClick={() => setTpl(p => ({ ...p, logo_url: null }))} style={paletteBtn('#1a0a0a', '#f87171')}>
                                    <FontAwesomeIcon icon={faTimes} /> Remove Logo
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: 20, borderTop: '1px solid #1e1e1e', paddingTop: 16 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#ccc' }}>
                                <div onClick={() => setTpl(p => ({ ...p, is_default: !p.is_default }))}
                                    style={{ width: 36, height: 20, borderRadius: 10, background: tpl.is_default ? '#D4AF37' : '#333', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
                                    <div style={{ position: 'absolute', top: 2, left: tpl.is_default ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                                </div>
                                Set as Default
                            </label>
                            {tpl.id && (
                                <button onClick={deleteTpl} style={{ ...paletteBtn('#1a0a0a', '#f87171'), marginTop: 12 }}>
                                    <FontAwesomeIcon icon={faTrash} /> Delete Template
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Center: Canvas ── */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 0', overflowY: 'auto', background: '#0d0d0d' }}>
                        <p style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: '0.1em' }}>
                            DRAG ELEMENTS DIRECTLY ON THE CANVAS TO POSITION THEM
                        </p>

                        {/* A4 Canvas */}
                        <div
                            ref={canvasRef}
                            onClick={() => setActiveId(null)}
                            style={{
                                width: CANVAS_W,
                                height: CANVAS_H,
                                backgroundColor: tpl.background_color || '#1a1a1a',
                                backgroundImage: tpl.background_image ? `url(${tpl.background_image})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative',
                                borderRadius: 4,
                                overflow: 'hidden',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
                                userSelect: 'none',
                                cursor: 'default',
                                flexShrink: 0,
                            }}
                        >
                            {/* Logo */}
                            {tpl.logo_url && (
                                <img src={tpl.logo_url} alt="Logo"
                                    style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', height: 40, objectFit: 'contain', pointerEvents: 'none', zIndex: 0 }} />
                            )}

                            {/* Elements */}
                            {(tpl.elements || []).map(el => {
                                if (!el.visible) return null;
                                const xPx = (el.x / 100) * CANVAS_W;
                                const yPx = (el.y / 100) * CANVAS_H;
                                const wPx = ((el.width || 70) / 100) * CANVAS_W;
                                const scale = CANVAS_W / 595.28;
                                const isActive = activeId === el.id;

                                return (
                                    <div
                                        key={el.id}
                                        onMouseDown={(e) => onMouseDown(e, el.id)}
                                        onClick={(e) => { e.stopPropagation(); setActiveId(el.id); }}
                                        style={{
                                            position: 'absolute',
                                            left: xPx - wPx / 2,
                                            top: yPx,
                                            width: wPx,
                                            fontSize: (el.fontSize || 12) * scale,
                                            fontWeight: el.fontWeight || 'normal',
                                            color: el.color || '#ffffff',
                                            textAlign: el.align || 'center',
                                            cursor: el.locked ? 'not-allowed' : 'grab',
                                            outline: isActive
                                                ? '2px solid #D4AF37'
                                                : '1px dashed rgba(255,255,255,0.08)',
                                            outlineOffset: 3,
                                            padding: '2px 4px',
                                            borderRadius: 2,
                                            wordBreak: 'break-word',
                                            lineHeight: 1.35,
                                            boxSizing: 'border-box',
                                            zIndex: isActive ? 100 : 1,
                                            transition: 'outline 0.1s',
                                        }}
                                    >
                                        {/* Active tooltip */}
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                                                background: '#D4AF37', color: '#000', fontSize: 9, fontWeight: 700,
                                                padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none'
                                            }}>
                                                ↕ DRAG TO MOVE
                                            </div>
                                        )}
                                        {applyPreview(el.content)}
                                    </div>
                                );
                            })}
                        </div>

                        <p style={{ fontSize: 10, color: '#333', marginTop: 12 }}>
                            Preview shows sample values • Actual PDF uses real order data
                        </p>
                    </div>

                    {/* ── Right Sidebar: Element Properties ── */}
                    <div style={{ width: 260, background: '#111', borderLeft: '1px solid #1e1e1e', overflowY: 'auto', padding: 16, flexShrink: 0 }}>

                        {/* Layers list */}
                        <p style={secLabel}>Layers ({tpl.elements?.length || 0})</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
                            {[...(tpl.elements || [])].reverse().map(el => (
                                <div key={el.id} onClick={() => setActiveId(el.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8,
                                        cursor: 'pointer', fontSize: 11,
                                        background: activeId === el.id ? 'rgba(212,175,55,0.12)' : '#161616',
                                        border: activeId === el.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                                    }}>
                                    <FontAwesomeIcon icon={el.type === 'shortcode' ? faCode : faFont}
                                        style={{ color: el.color || '#D4AF37', fontSize: 10, width: 12, flexShrink: 0 }} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#bbb' }}>
                                        {applyPreview(el.content).substring(0, 22)}
                                    </span>
                                    <button onClick={e => { e.stopPropagation(); upd(el.id, { visible: !el.visible }); }}
                                        style={layerBtn}><FontAwesomeIcon icon={el.visible ? faEye : faEyeSlash} /></button>
                                    <button onClick={e => { e.stopPropagation(); upd(el.id, { locked: !el.locked }); }}
                                        style={layerBtn}><FontAwesomeIcon icon={el.locked ? faLock : faUnlock} /></button>
                                    <button onClick={e => { e.stopPropagation(); dup(el.id); }}
                                        style={layerBtn}><FontAwesomeIcon icon={faCopy} /></button>
                                    <button onClick={e => { e.stopPropagation(); del(el.id); }}
                                        style={{ ...layerBtn, color: '#f87171' }}><FontAwesomeIcon icon={faTrash} /></button>
                                </div>
                            ))}
                            {(!tpl.elements || tpl.elements.length === 0) && (
                                <p style={{ color: '#333', fontSize: 11, textAlign: 'center', padding: 12 }}>
                                    No elements yet.<br />Add from the left panel.
                                </p>
                            )}
                        </div>

                        {/* Active element editor */}
                        {activeEl ? (
                            <>
                                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 14, marginTop: 4 }}>
                                    <p style={secLabel}>
                                        {activeEl.type === 'shortcode' ? '⚡ Shortcode' : '✏️ Text'} Properties
                                    </p>

                                    {/* Content */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={lbl}>Content</label>
                                        {activeEl.type === 'shortcode' ? (
                                            <select value={activeEl.content} onChange={e => upd(activeId, { content: e.target.value })}
                                                style={{ ...smallInput, color: '#D4AF37', fontFamily: 'monospace' }}>
                                                {SHORTCODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                                            </select>
                                        ) : (
                                            <textarea value={activeEl.content} onChange={e => upd(activeId, { content: e.target.value })}
                                                rows={2} style={{ ...smallInput, resize: 'none' }} />
                                        )}
                                    </div>

                                    {/* Position */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                        <div>
                                            <label style={lbl}>X (%)</label>
                                            <input type="number" min={0} max={100} step={0.5}
                                                value={activeEl.x} onChange={e => upd(activeId, { x: +e.target.value })} style={smallInput} />
                                        </div>
                                        <div>
                                            <label style={lbl}>Y (%)</label>
                                            <input type="number" min={0} max={100} step={0.5}
                                                value={activeEl.y} onChange={e => upd(activeId, { y: +e.target.value })} style={smallInput} />
                                        </div>
                                        <div>
                                            <label style={lbl}>Font Size</label>
                                            <input type="number" min={6} max={80}
                                                value={activeEl.fontSize} onChange={e => upd(activeId, { fontSize: +e.target.value })} style={smallInput} />
                                        </div>
                                        <div>
                                            <label style={lbl}>Width (%)</label>
                                            <input type="number" min={10} max={100}
                                                value={activeEl.width || 70} onChange={e => upd(activeId, { width: +e.target.value })} style={smallInput} />
                                        </div>
                                    </div>

                                    {/* Color */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={lbl}>Color</label>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <input type="color" value={activeEl.color || '#ffffff'}
                                                onChange={e => upd(activeId, { color: e.target.value })}
                                                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
                                            <input value={activeEl.color || '#ffffff'}
                                                onChange={e => upd(activeId, { color: e.target.value })}
                                                style={{ ...smallInput, fontFamily: 'monospace', flex: 1 }} />
                                        </div>
                                    </div>

                                    {/* Font weight + Align */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                        <div>
                                            <label style={lbl}>Weight</label>
                                            <select value={activeEl.fontWeight || 'normal'}
                                                onChange={e => upd(activeId, { fontWeight: e.target.value })} style={smallInput}>
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={lbl}>Align</label>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {['left', 'center', 'right'].map(a => (
                                                    <button key={a} onClick={() => upd(activeId, { align: a })}
                                                        style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, background: activeEl.align === a ? '#D4AF37' : '#1e1e1e', color: activeEl.align === a ? '#000' : '#666' }}>
                                                        <FontAwesomeIcon icon={a === 'left' ? faAlignLeft : a === 'center' ? faAlignCenter : faAlignRight} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick color presets */}
                                    <div>
                                        <label style={lbl}>Quick Colors</label>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {['#D4AF37', '#ffffff', '#000000', '#cccccc', '#888888', '#f87171', '#60a5fa', '#34d399'].map(c => (
                                                <div key={c} onClick={() => upd(activeId, { color: c })}
                                                    style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer', border: activeEl.color === c ? '2px solid #D4AF37' : '2px solid transparent', boxSizing: 'border-box' }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#333', fontSize: 12, padding: '20px 0' }}>
                                <FontAwesomeIcon icon={faCode} style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                                Click an element on the canvas<br />to edit its properties
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#333' }}>
                    <FontAwesomeIcon icon={faImage} style={{ fontSize: 56 }} />
                    <p style={{ fontSize: 14 }}>Select a template or create a new one</p>
                    <button onClick={newTpl} style={topBtn('#D4AF37', '#000', true)}>+ Create New Template</button>
                </div>
            )}
        </div>
    );
}

// ── Micro styles ──────────────────────────────────────────────────────────────
const secLabel = { fontSize: 9, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, marginTop: 0 };
const lbl = { display: 'block', fontSize: 10, color: '#555', marginBottom: 3 };
const smallInput = {
    width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7,
    padding: '6px 8px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box'
};
const layerBtn = { background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 10, padding: '1px 3px', flexShrink: 0 };
const paletteBtn = (bg, color) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
    background: bg, color, border: '1px solid #222', borderRadius: 8, cursor: 'pointer',
    fontSize: 11, fontWeight: 500, marginBottom: 5, textAlign: 'left',
});
const topBtn = (bg, color, bold = false) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: bg, color, border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: bold ? 700 : 500,
});
