import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faUpload, faTrash, faVideo, faPlus, faLink, faTimes, faCrown, faLock, faSpinner, faShoppingCart, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { Editor } from '@tinymce/tinymce-react';
import { useTranslation } from 'react-i18next';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
import { API_URL } from '../../config';

import { compressImage, compressImageToBlob, fileToBase64 } from '../../utils/imageOptimizer';

const CreateMemorialAdmin = () => {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const { addTribute, addMedia, uploadMediaFile, addToCart, products, fetchProducts, fetchTributes, fetchMedia, showToast, showAlert, getAuthHeaders } = useTributeContext();
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [subscriptions, setSubscriptions] = useState(undefined); // undefined = checking
    const [userMemorials, setUserMemorials] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        passingDate: '',
        bio: '',
        photo: null,
        images: [],
        videos: [],
        videoUrls: [''],
        coverUrl: null,
        status: 'public'
    });
    const [previews, setPreviews] = useState({
        photo: null,
        cover: null,
        images: [],
        videos: []
    });
    const [mediaPicker, setMediaPicker] = useState({ isOpen: false, callback: null, type: 'image' });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.username === 'admin' || user.email?.includes('admin');

    // Check subscription + load products + user memorials
    useEffect(() => {
        fetchProducts();
        if (isAdmin) {
            setSubscriptions([{ status: 'active', memorial_id: null }]);
            return;
        }
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch user memorials to see which subs are taken
        fetch(`${API_URL}/api/tributes`, { headers })
            .then(r => r.json())
            .then(d => {
                const mine = Array.isArray(d) ? d.filter(t => String(t.userId) === String(user.id) || String(t.user_id) === String(user.id)) : [];
                setUserMemorials(mine);

                // Now we have both subs and memorials
                fetch(`${API_URL}/api/subscriptions/my`, { headers })
                    .then(r => r.json())
                    .then(sData => {
                        const subsList = sData.subscriptions || [];
                        setSubscriptions(subsList);
                    }).catch(() => setSubscriptions([]));

            })
            .catch(() => setUserMemorials([]));
    }, [isAdmin, user.id, products, addToCart, navigate, showToast]);

    // An "available" sub is one that is active/trial and NOT linked to a memorial yet
    const availableSubscription = subscriptions?.find(s =>
        (s.status === 'active' || s.status === 'trial') && !s.memorial_id
    );

    const hasActiveSubscription = isAdmin || !!availableSubscription;

    // Pick the first subscription product to add to cart
    const subscriptionProduct = products?.find(p =>
        p.is_lifetime || p.is_voucher || p.category?.toLowerCase().includes('subscription')
    ) || products?.[0] || null;

    const needsToPay = !isAdmin && !availableSubscription && !subscriptionProduct;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (previews.photo && previews.photo.startsWith('blob:')) {
                URL.revokeObjectURL(previews.photo);
            }
            setFormData(prev => ({ ...prev, photo: file }));
            setPreviews(prev => ({ ...prev, photo: URL.createObjectURL(file) }));
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (previews.cover && previews.cover.startsWith('blob:')) URL.revokeObjectURL(previews.cover);
            setFormData(prev => ({ ...prev, coverUrl: file }));
            setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
        }
    };

    const handleGalleryUpload = (e, type) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            if (type === 'videos' && !isAdmin) {
                showAlert('Video uploads are restricted in the free version.', 'info', 'Feature Restricted');
                return;
            }

            if (type === 'images' && !isAdmin) {
                const currentCount = formData.images?.length || 0;
                if (currentCount + files.length > 5) {
                    showAlert('Limit of 5 images reached for free version.', 'warning');
                    const sliceCount = 5 - currentCount;
                    if (sliceCount <= 0) return;
                    files.splice(sliceCount);
                }
            }

            const newFiles = files.filter(file => {
                if (file.size > 100 * 1024 * 1024) {
                    showAlert(`File ${file.name} is too large (max 100MB). It will be skipped.`, 'warning');
                    return false;
                }
                return true;
            });

            setFormData(prev => ({
                ...prev,
                [type]: [...(prev[type] || []), ...newFiles]
            }));
            const newPreviews = newFiles.map(f => URL.createObjectURL(f));
            setPreviews(prev => ({
                ...prev,
                [type]: [...(prev[type] || []), ...newPreviews]
            }));
        }
    };

    const removeGalleryItem = (type, index) => {
        setFormData(prev => {
            const newItems = prev[type].filter((_, i) => i !== index);
            return { ...prev, [type]: newItems };
        });
        setPreviews(prev => {
            const newPreviews = prev[type].filter((_, i) => i !== index);
            const removedPreviewUrl = prev[type][index];
            if (removedPreviewUrl && removedPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(removedPreviewUrl);
            }
            return { ...prev, [type]: newPreviews };
        });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.name) { showToast('Please enter the full name.', 'error'); return; }
        if (loading) return;
        setLoading(true);

        try {
            const birthDateFormatted = formData.birthDate ? new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const passingDateFormatted = formData.passingDate ? new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            setLoadingStatus('Creating memorial...');
            // Compress images right now
            // 1. Process Profile & Cover Images IN PARALLEL
            const [photoPayload, coverPayload] = await Promise.all([
                formData.photo instanceof File
                    ? compressImage(formData.photo, { maxWidth: 600, quality: 0.5 })
                    : Promise.resolve(formData.photo),
                formData.coverUrl instanceof File
                    ? compressImage(formData.coverUrl, { maxWidth: 1200, quality: 0.5 })
                    : Promise.resolve(formData.coverUrl)
            ]);

            const tributeData = {
                name: formData.name,
                dates: `${birthDateFormatted} - ${passingDateFormatted}`,
                birthDate: formData.birthDate,
                passingDate: formData.passingDate,
                bio: formData.bio,
                photo: photoPayload,
                slug,
                userId: user.id,
                videoUrls: (formData.videoUrls || []).filter(url => url && url.trim() !== ''),
                coverUrl: coverPayload,
                status: formData.status,
                // images and videos are handled separately after tribute creation
            };

            // ── Tribute Creation ──────────────────────────────────────────────


            setLoadingStatus('Creating memorial...');
            // ── Create Memorial ──────────────────────────────────────────────
            const createdTribute = await addTribute({
                ...tributeData
            });

            if (createdTribute && createdTribute.id) {
                const totalMedia = (formData.images?.length || 0) + (formData.videos?.length || 0);
                if (totalMedia > 0) {
                    setLoadingStatus('Creating memorial...');
                    let uploadedCount = 0;

                    // Upload IMAGES sequentially
                    if (formData.images?.length > 0) {
                        for (const img of formData.images) {
                            try {
                                if (img instanceof File) {
                                    const blob = await compressImageToBlob(img, { maxWidth: 1000, quality: 0.6 });
                                    const compressedFile = new File([blob], img.name, { type: 'image/jpeg' });
                                    await uploadMediaFile(createdTribute.id, 'image', compressedFile, true);
                                } else {
                                    await addMedia(createdTribute.id, 'image', img, true);
                                }
                            } catch (err) {
                                console.error("Gallery upload error:", err);
                            } finally {
                                uploadedCount++;
                                setLoadingStatus('Creating memorial...');
                            }
                        }
                    }

                    // Upload VIDEOS sequentially
                    if (formData.videos?.length > 0) {
                        for (const vid of formData.videos) {
                            try {
                                if (vid instanceof File) {
                                    await uploadMediaFile(createdTribute.id, 'video', vid, true);
                                } else {
                                    await addMedia(createdTribute.id, 'video', vid, true);
                                }
                            } catch (err) {
                                console.error("Gallery video upload error:", err);
                            } finally {
                                uploadedCount++;
                                setLoadingStatus('Creating memorial...');
                            }
                        }
                    }
                }

                setLoading(false);
                showToast('Memorial created successfully!', 'success');
                navigate('/admin/memorials');

                // Background refresh
                fetchTributes?.();
                fetchMedia?.();
            } else {
                showToast('Failed to create memorial page.', 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showToast(error.message || 'An error occurred. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking initial state
    if (subscriptions === undefined) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
                <span>Checking subscription…</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add New Memorial</h2>
                <button onClick={() => navigate('/admin/memorials')} className="text-gray-500 hover:text-dark flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                        <input
                            type="text" name="name" required value={formData.name} onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Enter the full name of the deceased"
                        />
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
                            onEditorChange={(content) => setFormData({ ...formData, bio: content })}
                        />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Media Gallery</h3>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Photos</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                {formData.images.map((item, index) => {
                                    const src = (item instanceof File) ? previews.images[index] : item;
                                    return (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200">
                                            <img src={src} alt="Gallery" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryItem('images', index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    );
                                })}
                                <div
                                    onClick={() => document.getElementById('gallery-images-upload').click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-xl mb-1" />
                                    <span className="text-xs">Add Photos</span>
                                </div>
                            </div>
                            <input
                                id="gallery-images-upload" type="file" multiple accept="image/*" className="hidden"
                                onChange={(e) => handleGalleryUpload(e, 'images')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Videos</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.videos.map((vid, index) => {
                                    const src = (vid instanceof File) ? previews.videos[index] : vid;
                                    return (
                                        <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-black group border border-gray-100">
                                            <video src={src} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <FontAwesomeIcon icon={faVideo} className="text-white/30 text-2xl" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryItem('videos', index)}
                                                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                                id="gallery-videos-upload" type="file" multiple accept="video/*" className="hidden"
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
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b border-gray-100 pb-2">Publish</h3>

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

                        <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-100">
                            <p className="text-xs font-medium leading-relaxed text-blue-700">
                                <FontAwesomeIcon icon={faHeart} className="mr-1 text-blue-500" />
                                Your first memorial page is completely free!
                            </p>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-opacity-90 disabled:opacity-70 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> {loadingStatus || 'Processing...'}</>
                            ) : (
                                hasActiveSubscription
                                    ? <><FontAwesomeIcon icon={faSave} /> Publish</>
                                    : <><FontAwesomeIcon icon={faSave} /> Create Free Memorial</>
                            )}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b border-gray-100 pb-2">Important Dates</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date of Birth</label>
                                <input
                                    type="date" name="birthDate" required value={formData.birthDate} onChange={handleInputChange}
                                    className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date of Passing</label>
                                <input
                                    type="date" name="passingDate" required value={formData.passingDate} onChange={handleInputChange}
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
                                    <img src={previews.photo || formData.photo} alt="Preview" className="w-full h-48 object-cover rounded" />
                                    <button
                                        type="button" onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('admin-photo-upload').click()}
                                    className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faImage} className="text-gray-300 text-2xl mb-2" />
                                    <span className="text-gray-400 text-xs">Click to upload image</span>
                                </div>
                            )}
                            <input id="admin-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
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

export default CreateMemorialAdmin;
