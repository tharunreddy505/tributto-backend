import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faTrash, faVideo, faPlus, faLink, faTimes, faEnvelope, faCrown, faGlobe, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { Editor } from '@tinymce/tinymce-react';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
import { API_URL } from '../../config';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];
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
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { compressImage, compressImageToBlob, fileToBase64 } from '../../utils/imageOptimizer';

const SortablePhoto = ({ id, src, onRemove, index }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200"
        >
            <img
                src={src}
                alt="Gallery"
                className="w-full h-full object-cover cursor-move"
                {...attributes}
                {...listeners}
            />
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            >
                <FontAwesomeIcon icon={faTrash} />
            </button>
        </div>
    );
};

const EditMemorialAdmin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tributes, updateTribute, addMedia, uploadMediaFile, removeMedia, fetchTributes, fetchMedia, isInitialized, showToast, showAlert, reorderMedia, getAuthHeaders } = useTributeContext();
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [activeLang, setActiveLang] = useState('en');
    const [langVersions, setLangVersions] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        passingDate: '',
        bio: '',
        photo: null,
        slug: '',
        images: [],
        videos: [],
        videoUrls: [],
        coverUrl: null,
        status: 'public'
    });

    const [newMedia, setNewMedia] = useState({
        images: [],
        videos: []
    });

    const [previews, setPreviews] = useState({
        photo: null,
        cover: null,
        images: [],
        videos: []
    });

    const [hasLoadedData, setHasLoadedData] = useState(false);
    const [mediaPicker, setMediaPicker] = useState({ isOpen: false, callback: null, type: 'image' });
    const [authorInfo, setAuthorInfo] = useState(null);
    const hasFetchedAuthor = useRef(false);

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isAdminUser = currentUser && (
        currentUser.role === 'admin' ||
        currentUser.isAdmin ||
        currentUser.username === 'admin' ||
        currentUser.email?.includes('admin')
    );

    useEffect(() => {
        if (isInitialized && !hasLoadedData) {
            const found = tributes.find(t => String(t.id) === id);
            if (found) {
                const formatDateForInput = (dateStr) => {
                    if (!dateStr) return '';
                    try {
                        const date = new Date(dateStr);
                        if (isNaN(date.getTime())) return '';
                        return date.toISOString().split('T')[0];
                    } catch (e) { return ''; }
                };

                const baseName = found.name || '';
                const baseBio = found.bio || found.text || '';

                setFormData({
                    name: baseName,
                    birthDate: formatDateForInput(found.birthDate),
                    passingDate: formatDateForInput(found.passingDate),
                    bio: baseBio,
                    photo: found.image || found.photo || null,
                    slug: found.slug || '',
                    images: found.images || [],
                    videos: found.videos || [],
                    videoUrls: found.videoUrls && found.videoUrls.length > 0 ? found.videoUrls : [''],
                    coverUrl: found.coverUrl || null,
                    authorName: found.authorName || null,
                    packageName: found.packageName || null,
                    status: found.status || 'public'
                });
                setHasLoadedData(true);

                // Fetch translations for all languages
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const fetchAllTranslations = async () => {
                    const versions = {};
                    for (const lang of LANGUAGES) {
                        try {
                            const r = await fetch(`${API_URL}/api/tributes/${id}/translations/${lang.code}`, { headers });
                            if (r.ok) {
                                const d = await r.json();
                                versions[lang.code] = { name: d.name || baseName, bio: d.bio || baseBio };
                            } else {
                                versions[lang.code] = { name: baseName, bio: baseBio };
                            }
                        } catch {
                            versions[lang.code] = { name: baseName, bio: baseBio };
                        }
                    }
                    setLangVersions(versions);
                };
                fetchAllTranslations();

                // Fetch Author Info (Admin Only)
                const authorId = found.userId || found.user_id || found.author_id;
                if (isAdminUser && authorId && !hasFetchedAuthor.current) {
                    hasFetchedAuthor.current = true;
                    fetch(`${API_URL}/api/subscriptions/user/${String(authorId).trim()}`, { headers })
                        .then(r => r.ok ? r.json() : null)
                        .then(data => { if (data && data.user) setAuthorInfo(data); })
                        .catch(err => console.error('Fetch Author Error:', err));
                }
            }
        }
    }, [id, tributes, isInitialized, hasLoadedData, isAdminUser]);

    useEffect(() => {
        setHasLoadedData(false);
        hasFetchedAuthor.current = false;
        setAuthorInfo(null);
        setLangVersions({});
        setActiveLang('en');
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, photo: file }));
            if (previews.photo && previews.photo.startsWith('blob:')) URL.revokeObjectURL(previews.photo);
            setPreviews(prev => ({ ...prev, photo: URL.createObjectURL(file) }));
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, coverUrl: file }));
            if (previews.cover && previews.cover.startsWith('blob:')) URL.revokeObjectURL(previews.cover);
            setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
        }
    };

    const handleGalleryUpload = (e, type) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Apply limits for non-admin users on free plans
            const isFreePlan = !isAdminUser && (!formData.packageName || formData.packageName.toLowerCase().includes('free'));

            if (isFreePlan) {
                if (type === 'videos') {
                    showAlert('Video uploads are restricted in the free version.', 'info', 'Feature Restricted');
                    return;
                }

                if (type === 'images') {
                    const currentCount = formData.images?.length || 0;
                    if (currentCount + files.length > 5) {
                        showAlert('Limit of 5 images reached for free version.', 'warning');
                        const sliceCount = 5 - currentCount;
                        if (sliceCount <= 0) return;
                        files.splice(sliceCount);
                    }
                }
            }

            const ValidFiles = files.filter(file => {
                if (file.size > 100 * 1024 * 1024) {
                    showAlert(`File ${file.name} is too large (max 100MB). It will be skipped.`, "warning");
                    return false;
                }
                return true;
            });

            setFormData(prev => ({
                ...prev,
                [type]: [...(prev[type] || []), ...ValidFiles]
            }));

            setNewMedia(prev => ({
                ...prev,
                [type]: [...prev[type], ...ValidFiles]
            }));

            const newPreviews = ValidFiles.map(f => URL.createObjectURL(f));
            setPreviews(prev => ({
                ...prev,
                [type]: [...(prev[type] || []), ...newPreviews]
            }));
        }
    };

    const removeGalleryItem = async (type, index) => {
        const itemToRemove = formData[type][index];
        const isFile = itemToRemove instanceof File;

        if (isFile) {
            // Find which File this is in the local file list
            const fileIdx = formData[type].slice(0, index).filter(it => it instanceof File).length;
            setPreviews(prev => {
                const updated = [...prev[type]];
                const removedUrl = updated.splice(fileIdx, 1)[0];
                if (removedUrl && removedUrl.startsWith('blob:')) URL.revokeObjectURL(removedUrl);
                return { ...prev, [type]: updated };
            });

            setNewMedia(prev => ({
                ...prev,
                [type]: prev[type].filter(item => item !== itemToRemove)
            }));
        }

        if (typeof itemToRemove === 'object' && itemToRemove.id) {
            await removeMedia(itemToRemove.id);
        }

        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }));
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = formData.images.findIndex((item, i) => {
                const itemId = (typeof item === 'object' && item.id) ? item.id : `img-${i}`;
                return itemId === active.id;
            });
            const newIndex = formData.images.findIndex((item, i) => {
                const itemId = (typeof item === 'object' && item.id) ? item.id : `img-${i}`;
                return itemId === over.id;
            });

            if (oldIndex !== -1 && newIndex !== -1) {
                const newImages = arrayMove(formData.images, oldIndex, newIndex);
                setFormData(prev => ({ ...prev, images: newImages }));

                // Get IDs of stored media in their new relative order
                const storedMediaIds = newImages
                    .filter(img => typeof img === 'object' && img.id)
                    .map(img => img.id);

                if (storedMediaIds.length > 1) {
                    await reorderMedia(id, storedMediaIds);
                    showToast("Order updated", "success");
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            // 1. Sync the active language version with the shared formData (name/bio)
            const syncedLangVersions = {
                ...langVersions,
                [activeLang]: {
                    ...(langVersions[activeLang] || {}),
                    name: formData.name,
                    bio: formData.bio
                }
            };

            // 2. Use active lang as the primary tribute fields (updates the main row)
            const primaryLangData = syncedLangVersions[activeLang] || syncedLangVersions['en'] || {};

            const birthDateFormatted = new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const passingDateFormatted = new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const hasNewProfileImages = formData.photo instanceof File || formData.coverUrl instanceof File;
            setLoadingStatus('Updating memorial...');

            // Compress images ONLY NOW before sending to payload
            // 1. Process Profile & Cover Images IN PARALLEL
            const [photoPayload, coverPayload] = await Promise.all([
                formData.photo instanceof File
                    ? compressImage(formData.photo, { maxWidth: 600, quality: 0.5 })
                    : Promise.resolve(formData.photo),
                formData.coverUrl instanceof File
                    ? compressImage(formData.coverUrl, { maxWidth: 1200, quality: 0.5 })
                    : Promise.resolve(formData.coverUrl)
            ]);

            const updatedData = {
                name: primaryLangData.name || formData.name,
                dates: `${birthDateFormatted} - ${passingDateFormatted}`,
                birthDate: formData.birthDate,
                passingDate: formData.passingDate,
                bio: primaryLangData.bio || formData.bio,
                photo: photoPayload,
                coverUrl: coverPayload,
                slug: formData.slug,
                videoUrls: (formData.videoUrls || []).filter(url => url && url.trim() !== ''),
                status: formData.status
            };

            setLoadingStatus('Updating memorial...');
            const success = await updateTribute(Number(id), updatedData); // No longer silent, will refresh context

            if (success) {
                // 3. Save all language translations IN PARALLEL
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

                setLoadingStatus('Updating memorial...');
                const translationPromises = LANGUAGES.map(lang => {
                    const v = syncedLangVersions[lang.code];
                    if (!v) return Promise.resolve();
                    return fetch(`${API_URL}/api/tributes/${id}/translations/${lang.code}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ name: v.name || '', bio: v.bio || '' })
                    }).catch(e => console.error(`Save translation error (${lang.code}):`, e));
                });

                await Promise.all(translationPromises);

                const totalMedia = (newMedia.images?.length || 0) + (newMedia.videos?.length || 0);
                if (totalMedia > 0) {
                    setLoadingStatus('Updating memorial...');
                    let uploadedCount = 0;

                    // Upload IMAGES sequentially
                    if (newMedia.images?.length > 0) {
                        for (const img of newMedia.images) {
                            try {
                                if (img instanceof File) {
                                    const blob = await compressImageToBlob(img, { maxWidth: 1000, quality: 0.6 });
                                    const compressedFile = new File([blob], img.name, { type: 'image/jpeg' });
                                    await uploadMediaFile(Number(id), 'image', compressedFile, true);
                                } else {
                                    await addMedia(Number(id), 'image', img, true);
                                }
                            } catch (err) {
                                console.error("Gallery image upload error:", err);
                            } finally {
                                uploadedCount++;
                                setLoadingStatus('Updating memorial...');
                            }
                        }
                    }

                    // Upload VIDEOS sequentially
                    if (newMedia.videos?.length > 0) {
                        for (const vid of newMedia.videos) {
                            try {
                                if (vid instanceof File) {
                                    await uploadMediaFile(Number(id), 'video', vid, true);
                                } else {
                                    await addMedia(Number(id), 'video', vid, true);
                                }
                            } catch (err) {
                                console.error("Gallery video upload error:", err);
                            } finally {
                                uploadedCount++;
                                setLoadingStatus('Updating memorial...');
                            }
                        }
                    }
                }

                setLoadingStatus("Finishing up...");

                setLoading(false);
                showToast("Memorial updated successfully!", "success");
                navigate('/admin/memorials');

                // Background refresh
                fetchTributes?.();
                fetchMedia?.();
            } else {
                setLoading(false);
                showToast("Failed to update memorial info.", "error");
            }
        } catch (error) {
            console.error("Critical submission error:", error);
            setLoading(false);
            showToast("An error occurred during save.", "error");
        } finally {
            setLoading(false);
            setNewMedia({ images: [], videos: [] });
        }
    };

    // Called when switching language tabs — build the updated versions synchronously
    // so we can immediately read the target language from the same updated object
    const handleLangSwitch = (newLang) => {
        // 1. Build the COMPLETE updated map synchronously
        const updatedVersions = {
            ...langVersions,
            [activeLang]: {
                ...(langVersions[activeLang] || {}),
                name: formData.name,
                bio: formData.bio
            }
        };

        // 2. Persist to state
        setLangVersions(updatedVersions);

        // 3. Load new language from the SAME updated object (not stale closure)
        const target = updatedVersions[newLang] || {};
        setFormData(prev => ({
            ...prev,
            name: target.name !== undefined ? target.name : prev.name,
            bio: target.bio !== undefined ? target.bio : prev.bio
        }));

        setActiveLang(newLang);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Memorial</h2>
                <button onClick={() => navigate('/admin/memorials')} className="text-gray-500 hover:text-dark flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                <div className="lg:col-span-2 space-y-6">

                    {/* Language Tabs */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex border-b border-gray-100">
                            <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-xs font-bold uppercase border-r border-gray-100">
                                <FontAwesomeIcon icon={faGlobe} /> Language
                            </div>
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleLangSwitch(lang.code)}
                                    className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeLang === lang.code
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    <span>{lang.flag}</span> {lang.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 bg-blue-50/60">
                            <p className="text-xs text-blue-500">
                                Editing <strong>{LANGUAGES.find(l => l.code === activeLang)?.label}</strong> version. Fields below (Full Name &amp; Life Story) are per-language. All other settings are shared across languages.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name ({activeLang.toUpperCase()})</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Enter the full name of the deceased"
                        />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Permalink / Slug</label>
                        <div className="flex items-center">
                            <span className="text-gray-400 text-sm mr-2">{window.location.origin}/memorial/</span>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                className="flex-1 px-4 py-3 rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder="memorial-name"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Life Story / Bio — {LANGUAGES.find(l => l.code === activeLang)?.flag} {LANGUAGES.find(l => l.code === activeLang)?.label}
                        </label>
                        <Editor
                            key={`bio-editor-${activeLang}`}
                            apiKey={import.meta.env.VITE_TINYMCE_KEY}
                            value={formData.bio}
                            init={{
                                height: 500,
                                menubar: true,
                                plugins: [
                                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                                    'emoticons', 'directionality'
                                ],
                                toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | link image media table | alignleft aligncenter alignright alignjustify | numlist bullist indent outdent | emoticons charmap | removeformat | help',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                branding: false,
                                promotion: false,
                                file_picker_callback: (callback, value, meta) => {
                                    setMediaPicker({
                                        isOpen: true,
                                        callback: callback,
                                        type: meta.filetype === 'media' ? 'video' : 'image'
                                    });
                                }
                            }}
                            onEditorChange={(content) => setFormData(prev => ({ ...prev, bio: content }))}
                        />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Media Gallery</h3>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Photos</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={formData.images.map((item, index) => (typeof item === 'object' && item.id) ? item.id : `img-${index}`)}
                                        strategy={rectSortingStrategy}
                                    >
                                        {formData.images.map((item, index) => {
                                            const isFile = item instanceof File;
                                            let src = (typeof item === 'object' && item.url) ? item.url : item;
                                            if (isFile) {
                                                const fileIndex = formData.images.slice(0, index).filter(it => it instanceof File).length;
                                                src = previews.images[fileIndex];
                                            }
                                            const id = (!isFile && typeof item === 'object' && item.id) ? item.id : `img-${index}`;
                                            return (
                                                <SortablePhoto
                                                    key={id}
                                                    id={id}
                                                    src={src}
                                                    index={index}
                                                    onRemove={(idx) => removeGalleryItem('images', idx)}
                                                />
                                            );
                                        })}
                                    </SortableContext>
                                </DndContext>
                                <div
                                    onClick={() => document.getElementById('gallery-images-upload').click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-xl mb-1" />
                                    <span className="text-xs">Add Photos</span>
                                </div>
                            </div>
                            <input
                                id="gallery-images-upload"
                                type="file" multiple accept="image/*" className="hidden"
                                onChange={(e) => handleGalleryUpload(e, 'images')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Videos</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                {formData.videos.map((item, index) => {
                                    const isFile = item instanceof File;
                                    let src = (typeof item === 'object' && item.url) ? item.url : item;
                                    if (isFile) {
                                        const fileIndex = formData.videos.slice(0, index).filter(it => it instanceof File).length;
                                        src = previews.videos[fileIndex];
                                    }
                                    return (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group bg-black border border-gray-200">
                                            <video src={src} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <FontAwesomeIcon icon={faVideo} className="text-white/50 text-2xl" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryItem('videos', index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-auto"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    );
                                })}
                                <div
                                    onClick={() => document.getElementById('gallery-videos-upload').click()}
                                    className="aspect-video rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-xl mb-1" />
                                    <span className="text-xs">Add Videos</span>
                                </div>
                            </div>
                            <input
                                id="gallery-videos-upload"
                                type="file" multiple accept="video/*" className="hidden"
                                onChange={(e) => handleGalleryUpload(e, 'videos')}
                            />
                        </div>

                        {/* Video URLs Section */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-4">Video URLs (YouTube, Vimeo, etc.)</label>
                            <div className="space-y-3">
                                {formData.videoUrls.map((url, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <FontAwesomeIcon icon={faLink} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
                                            <input
                                                type="url"
                                                value={url}
                                                onChange={(e) => {
                                                    const newUrls = [...formData.videoUrls];
                                                    newUrls[idx] = e.target.value;
                                                    setFormData(prev => ({ ...prev, videoUrls: newUrls }));
                                                }}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                className="w-full pl-9 pr-4 py-2 rounded border border-gray-300 focus:border-primary outline-none text-sm"
                                            />
                                        </div>
                                        {formData.videoUrls.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, videoUrls: prev.videoUrls.filter((_, i) => i !== idx) }))}
                                                className="text-gray-300 hover:text-red-500 transition-colors px-2"
                                            >
                                                <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, videoUrls: [...prev.videoUrls, ''] }))}
                                    className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Add Another Video URL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b border-gray-100 pb-2">Update</h3>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Publication status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium text-gray-700 appearance-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 1rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1em'
                                }}
                            >
                                <option value="public">Public</option>
                                <option value="draft">Draft</option>
                                <option value="private">Private</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-2 italic">
                                {formData.status === 'public' ? 'Visible to everyone on the internet.' :
                                    formData.status === 'draft' ? 'Only visible to you (Owner/Admin). Use while editing.' :
                                        'Only visible to you and people with the direct link.'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-opacity-90 disabled:opacity-70 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> {loadingStatus || 'Updating...'}</>
                            ) : (
                                <><FontAwesomeIcon icon={faSave} /> Update Memorial</>
                            )}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b border-gray-100 pb-2">Important Dates</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date of Birth</label>
                                <input
                                    type="date" name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date of Passing</label>
                                <input
                                    type="date" name="passingDate"
                                    value={formData.passingDate}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b border-gray-100 pb-2">Featured Image</h3>
                        <div className="text-center">
                            {(formData.photo || previews.photo) ? (
                                <div className="mb-4 relative group">
                                    <img src={previews.photo || formData.photo} alt="Preview" className="w-full h-48 object-cover rounded" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('edit-photo-upload').click()}
                                    className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faImage} className="text-gray-300 text-2xl mb-2" />
                                    <span className="text-gray-400 text-xs">Click to upload image</span>
                                </div>
                            )}
                            <input
                                id="edit-photo-upload"
                                type="file" accept="image/*" className="hidden"
                                onChange={handlePhotoUpload}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Cover Image</label>
                        <div
                            className="relative aspect-[21/9] rounded-lg overflow-hidden border-2 border-dashed border-gray-200 hover:border-primary transition-colors cursor-pointer group bg-gray-50 flex items-center justify-center"
                            onClick={() => document.getElementById('cover-upload').click()}
                        >
                            {(formData.coverUrl || previews.cover) ? (
                                <>
                                    <img src={previews.cover || formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                        Change Cover Image
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <FontAwesomeIcon icon={faImage} className="text-2xl mb-2" />
                                    <p className="text-xs">Upload Background Cover</p>
                                </div>
                            )}
                            <input type="file" id="cover-upload" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">Recommended size: 1920x600px. This image will show as the background on the memorial page.</p>
                    </div>

                    {/* Author Widget */}
                    {(isAdminUser || formData.authorName) && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-6">
                            <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Author</label>
                            {authorInfo?.user || formData.authorName ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                                        {(authorInfo?.user?.username || formData.authorName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{authorInfo?.user?.username || formData.authorName}</p>
                                        {(authorInfo?.user?.email) && (
                                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                                <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                                                {authorInfo.user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No author info found</p>
                            )}
                        </div>
                    )}

                    {/* Package Widget */}
                    {(isAdminUser || formData.packageName) && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-6">
                            <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Subscription Package</label>
                            {authorInfo?.subscription || formData.packageName ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <FontAwesomeIcon icon={faCrown} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{authorInfo?.subscription?.product_name || formData.packageName || 'Standard'}</p>
                                        <p className="text-[10px] text-primary font-black uppercase">
                                            {authorInfo?.subscription?._linked_via_memorial ? 'LINKED VIA MEMORIAL' : 'ACTIVE'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No active subscription found</p>
                            )}
                        </div>
                    )}
                </div>
            </form>

            <MediaPickerModal
                isOpen={mediaPicker.isOpen}
                type={mediaPicker.type}
                onClose={() => setMediaPicker({ ...mediaPicker, isOpen: false })}
                onSelect={(m) => {
                    mediaPicker.callback(m.url, { title: m.name });
                    setMediaPicker({ ...mediaPicker, isOpen: false });
                }}
            />
        </div>
    );
};

export default EditMemorialAdmin;
