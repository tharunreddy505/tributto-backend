import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faTrash, faVideo, faPlus, faLink, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { Editor } from '@tinymce/tinymce-react';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
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

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 800;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

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
    const { tributes, updateTribute, addMedia, removeMedia, isInitialized, showToast, reorderMedia } = useTributeContext();
    const [loading, setLoading] = useState(false);
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
        coverUrl: null
    });

    const [newMedia, setNewMedia] = useState({
        images: [],
        videos: []
    });

    const [hasLoadedData, setHasLoadedData] = useState(false);
    const [mediaPicker, setMediaPicker] = useState({ isOpen: false, callback: null, type: 'image' });

    useEffect(() => {
        if (isInitialized && !hasLoadedData) {
            const tribute = tributes.find(t => String(t.id) === id);
            if (tribute) {
                const formatDateForInput = (dateStr) => {
                    if (!dateStr) return '';
                    try {
                        const date = new Date(dateStr);
                        if (isNaN(date.getTime())) return '';
                        return date.toISOString().split('T')[0];
                    } catch (e) { return ''; }
                };

                setFormData({
                    name: tribute.name || '',
                    birthDate: formatDateForInput(tribute.birthDate),
                    passingDate: formatDateForInput(tribute.passingDate),
                    bio: tribute.bio || tribute.text || '',
                    photo: tribute.image || tribute.photo || null,
                    slug: tribute.slug || '',
                    images: tribute.images || [],
                    videos: tribute.videos || [],
                    videoUrls: tribute.videoUrls && tribute.videoUrls.length > 0 ? tribute.videoUrls : [''],
                    coverUrl: tribute.coverUrl || null
                });
                setHasLoadedData(true);
            }
        }
    }, [id, tributes, isInitialized, hasLoadedData]);

    useEffect(() => {
        setHasLoadedData(false);
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await compressImage(file);
                setFormData(prev => ({ ...prev, photo: base64 }));
            } catch (error) { console.error("Error converting file:", error); }
        }
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await compressImage(file);
                setFormData(prev => ({ ...prev, coverUrl: base64 }));
            } catch (error) { console.error("Error converting cover file:", error); }
        }
    };

    const handleGalleryUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            try {
                const promises = files.map(file => {
                    if (file.size > 100 * 1024 * 1024) {
                        alert(`File ${file.name} is too large (max 100MB). It will be skipped.`);
                        return null;
                    }
                    if (file.type.startsWith('image/')) {
                        return compressImage(file);
                    } else {
                        return fileToBase64(file);
                    }
                });
                const results = await Promise.all(promises);
                const base64Files = results.filter(f => f !== null);

                setFormData(prev => ({
                    ...prev,
                    [type]: [...(prev[type] || []), ...base64Files]
                }));
                setNewMedia(prev => ({
                    ...prev,
                    [type]: [...prev[type], ...base64Files]
                }));

            } catch (error) { console.error(`Error converting ${type}:`, error); }
        }
    };

    const removeGalleryItem = async (type, index) => {
        const itemToRemove = formData[type][index];
        if (typeof itemToRemove === 'object' && itemToRemove.id) {
            await removeMedia(itemToRemove.id);
        }
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }));
        if (typeof itemToRemove === 'string') {
            setNewMedia(prev => ({
                ...prev,
                [type]: prev[type].filter(item => item !== itemToRemove)
            }));
        }
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

        const birthDateFormatted = new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const passingDateFormatted = new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const updatedData = {
            ...formData,
            dates: `${birthDateFormatted} - ${passingDateFormatted}`,
            text: formData.bio,
            image: formData.photo,
            videoUrls: (formData.videoUrls || []).filter(url => url && url.trim() !== '')
        };

        const success = await updateTribute(Number(id), updatedData);

        if (success) {
            showToast("Memorial updated successfully!", "success");
        } else {
            showToast("Failed to update memorial. Please check the console.", "error");
        }

        if (newMedia.images.length > 0) {
            for (const img of newMedia.images) {
                await addMedia(Number(id), 'image', img);
            }
        }
        if (newMedia.videos.length > 0) {
            for (const vid of newMedia.videos) {
                await addMedia(Number(id), 'video', vid);
            }
        }

        setNewMedia({ images: [], videos: [] });
        setHasLoadedData(false);
        setLoading(false);
        navigate('/admin/memorials');
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
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
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
                        <label className="block text-sm font-bold text-gray-700 mb-2">Life Story / Bio</label>
                        <Editor
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
                                            const src = typeof item === 'object' ? item.url : item;
                                            const id = (typeof item === 'object' && item.id) ? item.id : `img-${index}`;
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
                                    const src = typeof item === 'object' ? item.url : item;
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
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-opacity-90 disabled:opacity-70 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? 'Updating...' : <><FontAwesomeIcon icon={faSave} /> Update Memorial</>}
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
                            {formData.photo ? (
                                <div className="mb-4 relative group">
                                    <img src={formData.photo} alt="Preview" className="w-full h-48 object-cover rounded" />
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
                            {formData.coverUrl ? (
                                <>
                                    <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
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
