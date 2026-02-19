import React, { useState, useEffect } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faChevronRight, faChevronDown, faBars, faExternalLinkAlt, faSave, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_URL } from '../../config';

const SortableMenuItem = ({
    item, index, changeIndent, moveItem, removeItem, totalItems,
    isExpanded, onToggleExpand, onUpdateItem
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const [isTranslating, setIsTranslating] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginLeft: `${(item.indent || 0) * 40}px`,
        zIndex: isDragging ? 20 : (isExpanded ? 10 : 0),
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
    };

    const handleAutoTranslate = async (lang) => {
        if (!item.title) return;
        setIsTranslating(true);
        try {
            const response = await fetch(`${API_URL}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: item.title, targetLang: lang }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.translatedText) {
                    const newTranslations = { ...(item.translations || {}), [lang]: data.translatedText };
                    onUpdateItem(index, { translations: newTranslations });
                }
            }
        } catch (error) {
            console.error("Auto-translate failed:", error);
            alert("Translation failed. Please try manual input.");
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-1">
            <div
                className={`flex items-center gap-4 bg-white border border-gray-200 rounded p-3 hover:border-primary transition-all group ${item.indent > 0 ? 'border-l-4 border-l-primary/30' : ''} ${isExpanded ? 'border-primary' : ''}`}
            >
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move text-gray-300 group-hover:text-primary transition-colors p-2 -m-2"
                >
                    <FontAwesomeIcon icon={faBars} />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => onToggleExpand(index)}>
                    <span className="font-bold text-gray-700">{item.title}</span>
                    {item.indent > 0 && <span className="ml-2 text-[10px] text-primary italic font-medium">sub item</span>}
                    <span className="ml-3 text-[10px] text-gray-400 uppercase tracking-tighter">{item.type}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onToggleExpand(index)}
                        className={`w-8 h-8 rounded hover:bg-gray-100 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                    >
                        <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        onClick={() => changeIndent(index, -1)}
                        disabled={!item.indent}
                        className="w-8 h-8 rounded hover:bg-gray-100 text-gray-400 hover:text-primary disabled:opacity-20"
                        title="Move Left (Make Parent)"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                    </button>
                    <button
                        onClick={() => changeIndent(index, 1)}
                        className="w-8 h-8 rounded hover:bg-gray-100 text-gray-400 hover:text-primary disabled:opacity-20"
                        title="Move Right (Make Sub-menu)"
                    >
                        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                        className="w-6 h-6 rounded hover:bg-gray-100 text-gray-400 hover:text-dark disabled:opacity-20"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="-rotate-90" />
                    </button>
                    <button
                        disabled={index === totalItems - 1}
                        onClick={() => moveItem(index, 1)}
                        className="w-6 h-6 rounded hover:bg-gray-100 text-gray-400 hover:text-dark disabled:opacity-20"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="rotate-90" />
                    </button>
                    <button
                        onClick={() => removeItem(index)}
                        className="ml-2 w-8 h-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b p-4 -mt-1 ml-0 space-y-4 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Navigation Label (EN)</label>
                            <input
                                type="text"
                                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={item.title}
                                onChange={(e) => onUpdateItem(index, { title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL</label>
                            <input
                                type="text"
                                className={`w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary ${item.type === 'custom' ? 'bg-white' : 'bg-gray-100'}`}
                                value={item.url}
                                readOnly={item.type !== 'custom'}
                                onChange={(e) => {
                                    if (item.type === 'custom') {
                                        onUpdateItem(index, { url: e.target.value });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Translations</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAutoTranslate('de')}
                                    disabled={isTranslating}
                                    className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors font-bold disabled:opacity-50"
                                >
                                    {isTranslating ? '...' : 'Auto DE'}
                                </button>
                                <button
                                    onClick={() => handleAutoTranslate('it')}
                                    disabled={isTranslating}
                                    className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors font-bold disabled:opacity-50"
                                >
                                    {isTranslating ? '...' : 'Auto IT'}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">German (DE)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={item.translations?.de || ''}
                                    onChange={(e) => onUpdateItem(index, { translations: { ...(item.translations || {}), de: e.target.value } })}
                                    placeholder="Enter German title..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">Italian (IT)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={item.translations?.it || ''}
                                    onChange={(e) => onUpdateItem(index, { translations: { ...(item.translations || {}), it: e.target.value } })}
                                    placeholder="Enter Italian title..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MenusAdmin = () => {
    const {
        pages, posts, tributes,
        fetchMenus, fetchMenu, addMenu, updateMenu, deleteMenu, fetchMenuByLocation
    } = useTributeContext();

    const [menus, setMenus] = useState([]);
    const [selectedMenuId, setSelectedMenuId] = useState('');
    const [currentMenu, setCurrentMenu] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newMenuName, setNewMenuName] = useState('');
    const [expandedItemIndex, setExpandedItemIndex] = useState(null);

    // Accordion states for the left sidebar
    const [openAccordion, setOpenAccordion] = useState('pages');

    // Selection states for adding to menu
    const [selectedPages, setSelectedPages] = useState([]);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [selectedTributes, setSelectedTributes] = useState([]);
    const [customLink, setCustomLink] = useState({ title: '', url: 'https://' });

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadMenus();
    }, []);

    // Auto-clear messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const loadMenus = async () => {
        const data = await fetchMenus();
        setMenus(data);
        if (data.length > 0 && !selectedMenuId) {
            setSelectedMenuId(data[0].id);
            loadMenuDetails(data[0].id);
        }
    };

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const loadMenuDetails = async (id) => {
        setLoading(true);
        const data = await fetchMenu(id);
        if (data && data.items) {
            data.items = data.items.map(item => ({
                ...item,
                id: item.id || generateId(),
                translations: item.translations || {}
            }));
        }
        setCurrentMenu(data);
        setLoading(false);
    };

    const handleCreateMenu = async () => {
        if (!newMenuName) return;
        const data = await addMenu({ name: newMenuName });
        await loadMenus();
        setSelectedMenuId(data.id);
        loadMenuDetails(data.id);
        setNewMenuName('');
        setIsCreating(false);
        setSuccessMessage("Menu created successfully!");
    };

    const handleSaveMenu = async () => {
        if (!currentMenu) return;
        setLoading(true);
        try {
            await updateMenu(currentMenu.id, currentMenu);
            // Refresh primary menu in context in case it changed
            await fetchMenuByLocation('primary');
            setSuccessMessage("Menu saved successfully!");
        } catch (error) {
            console.error("Save failed:", error);
            setErrorMessage("Error saving menu: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMenu = async () => {
        if (!currentMenu || !window.confirm("Are you sure you want to delete this menu?")) return;
        await deleteMenu(currentMenu.id);
        setSelectedMenuId('');
        setCurrentMenu(null);
        loadMenus();
    };

    const addToMenu = (type) => {
        let itemsToAdd = [];
        if (type === 'pages') {
            itemsToAdd = pages.filter(p => selectedPages.includes(p.id)).map(p => ({
                title: p.title,
                url: `/${p.slug}`,
                type: 'page',
                object_id: p.id
            }));
            setSelectedPages([]);
        } else if (type === 'posts') {
            itemsToAdd = posts.filter(p => selectedPosts.includes(p.id)).map(p => ({
                title: p.title,
                url: `/post/${p.slug}`,
                type: 'post',
                object_id: p.id
            }));
            setSelectedPosts([]);
        } else if (type === 'tributes') {
            itemsToAdd = tributes.filter(t => selectedTributes.includes(t.id)).map(t => ({
                title: t.name,
                url: `/memorial/${t.slug || t.id}`,
                type: 'tribute',
                object_id: t.id
            }));
            setSelectedTributes([]);
        } else if (type === 'custom') {
            if (!customLink.title || !customLink.url) return;
            itemsToAdd = [{
                title: customLink.title,
                url: customLink.url,
                type: 'custom',
                object_id: null,
                indent: 0
            }];
            setCustomLink({ title: '', url: 'https://' });
        }

        const newItemsWithIndent = itemsToAdd.map(item => ({
            ...item,
            indent: 0,
            id: generateId(),
            translations: item.translations || {}
        }));

        if (currentMenu) {
            setCurrentMenu({
                ...currentMenu,
                items: [...(currentMenu.items || []), ...newItemsWithIndent]
            });
        }
    };

    const removeItem = (index) => {
        setCurrentMenu({
            ...currentMenu,
            items: currentMenu.items.filter((_, i) => i !== index)
        });
    };

    const moveItem = (index, direction) => {
        const items = [...currentMenu.items];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= items.length) return;

        const temp = items[index];
        items[index] = items[newIndex];
        items[newIndex] = temp;

        if (newIndex === 0) items[newIndex].indent = 0;
        setCurrentMenu({ ...currentMenu, items });
    };

    const changeIndent = (index, delta) => {
        const items = [...currentMenu.items];
        const newIndent = (items[index].indent || 0) + delta;

        // Rules for indention
        if (newIndent < 0 || newIndent > 1) return; // Limit to 1 level for simplicity
        if (index === 0 && newIndent > 0) return; // First item cannot be a sub-menu

        // Cannot indent more than 1 level deeper than the previous item
        if (delta > 0 && index > 0) {
            const prevIndent = items[index - 1].indent || 0;
            if (newIndent > prevIndent + 1) return;
        }

        items[index].indent = newIndent;
        setCurrentMenu({ ...currentMenu, items });
    };

    const updateMenuItem = (index, updates) => {
        const items = [...currentMenu.items];
        items[index] = { ...items[index], ...updates };
        setCurrentMenu({ ...currentMenu, items });
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setCurrentMenu((prev) => {
                const oldIndex = prev.items.findIndex(item => item.id === active.id);
                const newIndex = prev.items.findIndex(item => item.id === over.id);

                const newItems = arrayMove(prev.items, oldIndex, newIndex);

                // Ensure first item doesn't have indent
                if (newIndex === 0) newItems[0].indent = 0;

                return { ...prev, items: newItems };
            });
        }
    };

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-pulse flex items-center justify-between">
                    <span className="block sm:inline">{successMessage}</span>
                    <button onClick={() => setSuccessMessage('')}>
                        <FontAwesomeIcon icon={faChevronDown} className="transform rotate-180" />
                    </button>
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center justify-between">
                    <span className="block sm:inline">{errorMessage}</span>
                    <button onClick={() => setErrorMessage('')}>
                        <FontAwesomeIcon icon={faChevronDown} className="transform rotate-180" />
                    </button>
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-gray-600">Select a menu to edit:</label>
                    <select
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                        value={selectedMenuId}
                        onChange={(e) => {
                            setSelectedMenuId(e.target.value);
                            loadMenuDetails(e.target.value);
                        }}
                    >
                        {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-primary text-sm font-bold hover:underline"
                    >
                        or create a new menu
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Create New Menu</h3>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-4 py-2 mb-4 outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Menu Name (e.g. Main Menu)"
                            value={newMenuName}
                            onChange={(e) => setNewMenuName(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleCreateMenu} className="bg-primary text-white px-6 py-2 rounded-md font-bold">Create Menu</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Add Items */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-2">Add menu items</h3>

                    {/* Pages Accordion */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setOpenAccordion(openAccordion === 'pages' ? '' : 'pages')}
                            className="w-full flex items-center justify-between p-4 font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span>Pages</span>
                            <FontAwesomeIcon icon={openAccordion === 'pages' ? faChevronDown : faChevronRight} className="text-gray-400 text-xs" />
                        </button>
                        {openAccordion === 'pages' && (
                            <div className="p-4 space-y-3">
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {pages.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer hover:text-dark">
                                            <input
                                                type="checkbox"
                                                checked={selectedPages.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedPages([...selectedPages, p.id]);
                                                    else setSelectedPages(selectedPages.filter(id => id !== p.id));
                                                }}
                                            />
                                            {p.title}
                                        </label>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => setSelectedPages(pages.map(p => p.id))}
                                        className="text-xs text-primary hover:underline"
                                    >Select All</button>
                                    <button
                                        onClick={() => addToMenu('pages')}
                                        disabled={selectedPages.length === 0}
                                        className="bg-white border border-primary text-primary px-4 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                    >Add to Menu</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Posts Accordion */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setOpenAccordion(openAccordion === 'posts' ? '' : 'posts')}
                            className="w-full flex items-center justify-between p-4 font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span>Posts</span>
                            <FontAwesomeIcon icon={openAccordion === 'posts' ? faChevronDown : faChevronRight} className="text-gray-400 text-xs" />
                        </button>
                        {openAccordion === 'posts' && (
                            <div className="p-4 space-y-3">
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {posts.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer hover:text-dark">
                                            <input
                                                type="checkbox"
                                                checked={selectedPosts.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedPosts([...selectedPosts, p.id]);
                                                    else setSelectedPosts(selectedPosts.filter(id => id !== p.id));
                                                }}
                                            />
                                            {p.title}
                                        </label>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => setSelectedPosts(posts.map(p => p.id))}
                                        className="text-xs text-primary hover:underline"
                                    >Select All</button>
                                    <button
                                        onClick={() => addToMenu('posts')}
                                        disabled={selectedPosts.length === 0}
                                        className="bg-white border border-primary text-primary px-4 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                    >Add to Menu</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tributes Accordion */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setOpenAccordion(openAccordion === 'tributes' ? '' : 'tributes')}
                            className="w-full flex items-center justify-between p-4 font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span>Memorials</span>
                            <FontAwesomeIcon icon={openAccordion === 'tributes' ? faChevronDown : faChevronRight} className="text-gray-400 text-xs" />
                        </button>
                        {openAccordion === 'tributes' && (
                            <div className="p-4 space-y-3">
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {tributes.map(t => (
                                        <label key={t.id} className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer hover:text-dark">
                                            <input
                                                type="checkbox"
                                                checked={selectedTributes.includes(t.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedTributes([...selectedTributes, t.id]);
                                                    else setSelectedTributes(selectedTributes.filter(id => id !== t.id));
                                                }}
                                            />
                                            {t.name}
                                        </label>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => setSelectedTributes(tributes.map(t => t.id))}
                                        className="text-xs text-primary hover:underline"
                                    >Select All</button>
                                    <button
                                        onClick={() => addToMenu('tributes')}
                                        disabled={selectedTributes.length === 0}
                                        className="bg-white border border-primary text-primary px-4 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                    >Add to Menu</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Custom Links Accordion */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setOpenAccordion(openAccordion === 'custom' ? '' : 'custom')}
                            className="w-full flex items-center justify-between p-4 font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span>Custom Links</span>
                            <FontAwesomeIcon icon={openAccordion === 'custom' ? faChevronDown : faChevronRight} className="text-gray-400 text-xs" />
                        </button>
                        {openAccordion === 'custom' && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                        value={customLink.url}
                                        onChange={(e) => setCustomLink({ ...customLink, url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Text</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                        value={customLink.title}
                                        onChange={(e) => setCustomLink({ ...customLink, title: e.target.value })}
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        onClick={() => addToMenu('custom')}
                                        disabled={!customLink.title || !customLink.url}
                                        className="bg-white border border-primary text-primary px-4 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                    >Add to Menu</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Menu Structure */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
                        {currentMenu ? (
                            <>
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Menu Name</label>
                                            <input
                                                type="text"
                                                className="text-xl font-bold border-b border-gray-200 py-1 outline-none focus:border-primary w-full max-w-md"
                                                value={currentMenu.name}
                                                onChange={(e) => setCurrentMenu({ ...currentMenu, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-6">
                                        Drag the items into the order you prefer. Click the arrow on the right of the item to reveal additional configuration options.
                                    </div>

                                    {/* Menu Items List */}
                                    <div className="space-y-2">
                                        {(currentMenu.items || []).length > 0 ? (
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <SortableContext
                                                    items={(currentMenu.items || []).map(i => i.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {currentMenu.items.map((item, index) => (
                                                        <SortableMenuItem
                                                            key={item.id}
                                                            item={item}
                                                            index={index}
                                                            totalItems={currentMenu.items.length}
                                                            changeIndent={changeIndent}
                                                            moveItem={moveItem}
                                                            removeItem={removeItem}
                                                            isExpanded={expandedItemIndex === index}
                                                            onToggleExpand={(i) => setExpandedItemIndex(expandedItemIndex === i ? null : i)}
                                                            onUpdateItem={updateMenuItem}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        ) : (
                                            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-xl text-gray-400">
                                                Add items from the choices on the left.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto p-6 bg-gray-50/50 border-t border-gray-100">
                                    <h4 className="font-bold text-sm text-gray-700 mb-4">Menu Settings</h4>
                                    <div className="mb-8">
                                        <label className="flex items-start gap-4 text-sm text-gray-600 cursor-pointer">
                                            <div className="font-bold w-32 shrink-0">Display location</div>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentMenu.location === 'primary'}
                                                        onChange={(e) => setCurrentMenu({ ...currentMenu, location: e.target.checked ? 'primary' : null })}
                                                    />
                                                    Primary Menu (Main Navbar)
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-gray-400 italic">
                                                    <input type="checkbox" disabled />
                                                    Footer Menu
                                                </label>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                        <button
                                            onClick={handleDeleteMenu}
                                            className="text-red-500 font-bold text-xs hover:underline"
                                        >Delete Menu</button>
                                        <button
                                            onClick={handleSaveMenu}
                                            disabled={loading}
                                            className="bg-primary text-white px-8 py-2.5 rounded-md font-bold shadow-md hover:bg-opacity-90 transition-all flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faSave} />
                                            {loading ? 'Saving...' : 'Save Menu'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
                                <FontAwesomeIcon icon={faBars} size="3x" className="mb-6 opacity-10" />
                                <h3 className="text-xl font-bold mb-2">Select a menu to start</h3>
                                <p className="text-center max-w-xs">Please select a menu from the dropdown above to edit its structure, or create a brand new one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenusAdmin;
