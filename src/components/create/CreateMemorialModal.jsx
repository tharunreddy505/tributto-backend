import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload, faArrowRight, faArrowLeft, faImage, faVideo, faHeart, faCalendarAlt, faPlay, faLink, faShoppingCart, faSpinner, faLock } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';
import { useTranslation } from 'react-i18next';

import { compressImage, fileToBase64 } from '../../utils/imageOptimizer';

const CreateMemorialModal = ({ isOpen, onClose, selectedPackage = 'free' }) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { tributes, addTribute, addMedia, addToCart, products, fetchProducts, showAlert } = useTributeContext();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        passingDate: '',
        photo: null, // Stores File object for new, or URL string for existing
        bio: '',
        images: [], // Stores array of File objects for new, or URL strings for existing
        videos: [], // Stores array of File objects for new, or URL strings for existing
        videoUrls: [''],
        coverUrl: null, // Stores File object for new, or URL string for existing
        status: 'public'
    });
    const [previews, setPreviews] = useState({
        photo: null,
        cover: null,
        gallery: []
    });
    const [errors, setErrors] = useState({});

    // Restore draft from sessionStorage if coming back from register/login
    useEffect(() => {
        fetchProducts();
        const draft = sessionStorage.getItem('memorial_modal_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setFormData(prev => ({ ...prev, ...parsed }));
                sessionStorage.removeItem('memorial_modal_draft');
                setStep(1); // start at step 1 with restored data
            } catch (e) { /* ignore */ }
        }
    }, []);

    // Get logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const isLoggedIn = !!currentUser && !!localStorage.getItem('token');

    // Pick subscription product for cart
    const subscriptionProduct = products?.find(p =>
        p.is_lifetime || p.is_voucher || p.category?.toLowerCase().includes('subscription')
    ) || products?.[0] || null;

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, coverUrl: file }));
            // Cleanup old preview
            if (previews.cover && previews.cover.startsWith('blob:')) {
                URL.revokeObjectURL(previews.cover);
            }
            setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
        }
    };

    const handleNext = () => {
        if (step === 1) {
            const newErrors = {};
            if (!formData.name) newErrors.name = 'Full Name is required';
            if (!formData.birthDate) newErrors.birthDate = 'Date of Birth is required';
            if (!formData.passingDate) newErrors.passingDate = 'Passing Date is required';

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }

            // ── NOT logged in? Save draft + send to register ──────────────
            if (!isLoggedIn) {
                sessionStorage.setItem('memorial_modal_draft', JSON.stringify(formData));
                sessionStorage.setItem('memorial_redirect', 'create-memorial');
                onClose();
                navigate('/register?redirect=create-memorial');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleFinish = async () => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const slug = formData.name
                ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                : 'memorial-' + Date.now();

            const birthDateFormatted = formData.birthDate
                ? new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
            const passingDateFormatted = formData.passingDate
                ? new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

            // ── Prepare Payload (Compress images only now) ───────────
            let photoPayload = formData.photo;
            if (formData.photo instanceof File) {
                photoPayload = await compressImage(formData.photo, { maxWidth: 800, quality: 0.8 });
            }

            let coverPayload = formData.coverUrl;
            if (formData.coverUrl instanceof File) {
                coverPayload = await compressImage(formData.coverUrl, { maxWidth: 1920, quality: 0.8 });
            }

            const tributePayload = {
                name: formData.name,
                dates: `${birthDateFormatted} - ${passingDateFormatted}`,
                birthDate: formData.birthDate,
                passingDate: formData.passingDate,
                bio: formData.bio,
                photo: photoPayload,
                coverUrl: coverPayload,
                status: formData.status,
                slug,
                userId: currentUser?.id || null,
                videoUrls: (formData.videoUrls || []).filter(u => u && u.trim() !== '')
            };

            const userMemorials = currentUser ? tributes.filter(t => String(t.userId) === String(currentUser.id) || String(t.user_id) === String(currentUser.id)) : [];
            const hasReachedFreeLimit = userMemorials.length >= 1;

            if (selectedPackage && selectedPackage !== 'free') {
                // Convert gallery images to base64
                let convertedImages = [];
                if (formData.images?.length > 0) {
                    for (const item of formData.images) {
                        let mediaUrl = item;
                        if (item instanceof File) {
                            mediaUrl = await compressImage(item, { maxWidth: 1200, quality: 0.8 });
                        }
                        convertedImages.push(mediaUrl);
                    }
                }

                let convertedVideos = [];
                if (formData.videos?.length > 0) {
                    for (const item of formData.videos) {
                        let mediaUrl = item;
                        if (item instanceof File) {
                            mediaUrl = await fileToBase64(item);
                        }
                        convertedVideos.push(mediaUrl);
                    }
                }

                const draft = {
                    ...tributePayload,
                    images: convertedImages,
                    videos: convertedVideos
                };
                sessionStorage.setItem('pending_memorial_draft', JSON.stringify(draft));

                let targetProduct = null;
                const intentPackage = selectedPackage; // We know it's not 'free' here

                if (intentPackage === 'premium') {
                    targetProduct = products.find(p => p.name.toLowerCase().includes('premium') || p.price == 99 || p.is_lifetime == true);
                } else if (intentPackage === 'corporate') {
                    targetProduct = products.find(p => p.name.toLowerCase().includes('corporate') || p.name.toLowerCase().includes('business') || p.name.toLowerCase().includes('custom'));
                }

                // Fallback to any subscription product
                if (!targetProduct) {
                    targetProduct = products.find(p => p.type === 'subscription') || products[0];
                }

                if (!targetProduct) {
                    showAlert('Pricing package not found. Contact Support.', 'error');
                    setSubmitting(false);
                    return;
                }

                addToCart(targetProduct, 1, {
                    memorial_name: draft.name,
                    type: 'memorial_subscription'
                });

                onClose();
                navigate('/cart');
                setSubmitting(false);
                return;
            }

            // ── Create tribute in DB to get real ID ───────────
            const createdTribute = await addTribute(tributePayload);

            if (!createdTribute || !createdTribute.id) {
                showAlert('Failed to create memorial page. Please try again.', 'error');
                setSubmitting(false);
                return;
            }

            // Upload gallery media (Compress/Convert only now)
            if (formData.images?.length > 0) {
                for (const item of formData.images) {
                    let mediaUrl = item;
                    if (item instanceof File) {
                        mediaUrl = await compressImage(item, { maxWidth: 1200, quality: 0.8 });
                    }
                    await addMedia(createdTribute.id, 'image', mediaUrl);
                }
            }
            if (formData.videos?.length > 0) {
                for (const item of formData.videos) {
                    let mediaUrl = item;
                    if (item instanceof File) {
                        mediaUrl = await fileToBase64(item);
                    }
                    await addMedia(createdTribute.id, 'video', mediaUrl);
                }
            }

            // ── Tribute Created Successfully ───────────
            onClose();
            navigate('/admin/memorials');

        } catch (err) {
            console.error('Memorial creation error:', err);
            showAlert(err.message || String(err), 'error', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-fadeInUp">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-300 hover:text-dark transition-colors z-20"
                >
                    <FontAwesomeIcon icon={faTimes} className="text-xl" />
                </button>

                <div className="p-8 md:p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6 text-center">
                            <div className="mb-8">
                                <div className="mt-4 flex justify-center gap-8">
                                    {/* Profile Photo */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('create_memorial.profile_photo')}</span>
                                        <div className="relative group cursor-pointer">
                                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner hover:shadow-md transition-shadow">
                                                {previews.photo ? (
                                                    <img src={previews.photo} alt="Preview" className="w-full h-full object-cover" />
                                                ) : formData.photo && typeof formData.photo === 'string' ? (
                                                    <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FontAwesomeIcon icon={faUpload} className="text-gray-300 text-xl" />
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setFormData(prev => ({ ...prev, photo: file }));
                                                        if (previews.photo && previews.photo.startsWith('blob:')) URL.revokeObjectURL(previews.photo);
                                                        setPreviews(prev => ({ ...prev, photo: URL.createObjectURL(file) }));
                                                    }
                                                }}
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>

                                    {/* Cover Photo */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('create_memorial.cover_photo')}</span>
                                        <div className="relative group cursor-pointer">
                                            <div className="w-40 h-24 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner hover:shadow-md transition-shadow">
                                                {previews.cover ? (
                                                    <img src={previews.cover} alt="Cover Preview" className="w-full h-full object-cover" />
                                                ) : formData.coverUrl && typeof formData.coverUrl === 'string' ? (
                                                    <img src={formData.coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FontAwesomeIcon icon={faImage} className="text-gray-300 text-xl" />
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleCoverUpload}
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">{t('create_memorial.click_icons')}</p>
                            </div>

                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">{t('create_memorial.full_name')} <span className="text-primary">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-dark placeholder-gray-300`}
                                        placeholder="Eleanor Rose Mitchell"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1 text-left">{errors.name}</p>}
                                    <p className="text-[10px] text-gray-400 mt-1">{t('create_memorial.name_known_by')}</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">{t('create_memorial.dob')} <span className="text-primary">*</span></label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.birthDate ? 'border-red-500' : 'border-gray-200'} focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-dark placeholder-gray-300`}
                                    />
                                    {errors.birthDate && <p className="text-red-500 text-xs mt-1 text-left">{errors.birthDate}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">{t('create_memorial.passed_away')} <span className="text-primary">*</span></label>
                                    <input
                                        type="date"
                                        name="passingDate"
                                        value={formData.passingDate}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.passingDate ? 'border-red-500' : 'border-gray-200'} focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-dark placeholder-gray-300`}
                                    />
                                    {errors.passingDate && <p className="text-red-500 text-xs mt-1 text-left">{errors.passingDate}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">{t('create_memorial.pub_status')}</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, status: 'public' }))}
                                            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${formData.status === 'public'
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.status === 'public' ? 'bg-primary' : 'bg-gray-300'}`} />
                                            {t('create_memorial.public')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, status: 'private' }))}
                                            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${formData.status === 'private'
                                                ? 'border-dark bg-dark/5 text-dark'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.status === 'private' ? 'bg-dark' : 'bg-gray-300'}`} />
                                            {t('create_memorial.private')}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                                        {formData.status === 'public' ? t('create_memorial.public_desc') : t('create_memorial.private_desc')}
                                    </p>
                                </div>

                                {!isLoggedIn && (
                                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
                                        <strong>{t('create_memorial.note')}</strong> {t('create_memorial.login_note')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Story */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold font-serif text-dark text-center">{t('create_memorial.life_story')}</h3>
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    className="w-full h-64 bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-600 leading-relaxed font-description"
                                    placeholder={t('create_memorial.story_placeholder')}
                                ></textarea>
                            </div>
                            <p className="text-center text-xs text-gray-400">{t('create_memorial.story_desc')}</p>

                            <div className="pt-4">
                                <h4 className="text-sm font-bold text-dark mb-4">Photos & Videos (Optional)</h4>
                                <div className="space-y-6">
                                    {/* Photos Section */}
                                    <div className="space-y-3">
                                        <div
                                            onClick={() => document.getElementById('photo-upload').click()}
                                            className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:text-primary transition-all h-32 relative group bg-white"
                                        >
                                            <input
                                                id="photo-upload"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length > 0) {
                                                        const currentCount = formData.images?.length || 0;
                                                        if (currentCount + files.length > 5) {
                                                            showAlert("Limit of 5 images reached for free version.", "warning");
                                                            const sliceCount = 5 - currentCount;
                                                            if (sliceCount <= 0) return;
                                                            files.splice(sliceCount);
                                                        }
                                                        setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...files] }));
                                                        const newPrevs = files.map(f => URL.createObjectURL(f));
                                                        setPreviews(prev => ({ ...prev, gallery: [...prev.gallery, ...newPrevs] }));
                                                    }
                                                }}
                                            />
                                            <FontAwesomeIcon icon={faImage} className="text-xl mb-2 text-gray-300 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-medium text-dark group-hover:text-primary transition-colors">
                                                Add Photos
                                            </span>
                                        </div>

                                        {/* Photos Preview */}
                                        {formData.images && formData.images.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {formData.images.map((img, idx) => {
                                                    const src = (img instanceof File) ? previews.gallery[idx] : img;
                                                    return (
                                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                            <img src={src} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newImgs = [...formData.images];
                                                                    const newPrevs = [...previews.gallery];
                                                                    if (newImgs[idx] instanceof File && newPrevs[idx]) {
                                                                        URL.revokeObjectURL(newPrevs[idx]);
                                                                    }
                                                                    newImgs.splice(idx, 1);
                                                                    newPrevs.splice(idx, 1);
                                                                    setFormData(prev => ({ ...prev, images: newImgs }));
                                                                    setPreviews(prev => ({ ...prev, gallery: newPrevs }));
                                                                }}
                                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <FontAwesomeIcon icon={faTimes} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Videos Section */}
                                    <div className="space-y-3">
                                        <div
                                            onClick={() => showAlert("Video uploads are restricted in the free version.", "info", "Feature Restricted")}
                                            className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gray-300 transition-all h-32 relative group bg-gray-50/50 opacity-60"
                                        >
                                            <div className="absolute top-2 right-2">
                                                <FontAwesomeIcon icon={faLock} className="text-gray-400 text-xs" />
                                            </div>
                                            <FontAwesomeIcon icon={faVideo} className="text-xl mb-2 text-gray-300" />
                                            <span className="text-xs font-medium text-gray-400">
                                                Video Uploads Locked
                                            </span>
                                        </div>

                                        {/* Videos Preview */}
                                        {formData.videos && formData.videos.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {formData.videos.map((vid, idx) => {
                                                    const src = (vid instanceof File) ? (previews.videosList && previews.videosList[idx]) : vid;
                                                    return (
                                                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group bg-black">
                                                            <video src={src} className="w-full h-full object-cover opacity-80" />
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <FontAwesomeIcon icon={faPlay} className="text-white/50 text-xs" />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newVids = [...formData.videos];
                                                                    const newPrevs = [...(previews.videosList || [])];
                                                                    if (newVids[idx] instanceof File && newPrevs[idx]) {
                                                                        URL.revokeObjectURL(newPrevs[idx]);
                                                                    }
                                                                    newVids.splice(idx, 1);
                                                                    newPrevs.splice(idx, 1);
                                                                    setFormData(prev => ({ ...prev, videos: newVids }));
                                                                    setPreviews(prev => ({ ...prev, videosList: newPrevs }));
                                                                }}
                                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                                            >
                                                                <FontAwesomeIcon icon={faTimes} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Video URLs Section */}
                                    <div className="space-y-3 pt-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Video URLs (YouTube, Vimeo, etc.)</label>
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
                                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
                                                    />
                                                </div>
                                                {formData.videoUrls.length > 1 && (
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, videoUrls: prev.videoUrls.filter((_, i) => i !== idx) }))}
                                                        className="text-gray-300 hover:text-red-500 transition-colors px-2"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, videoUrls: [...prev.videoUrls, ''] }))}
                                            className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
                                        >
                                            <FontAwesomeIcon icon={faPlay} className="text-[10px]" /> + Add Another Video URL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review / Success */}
                    {step === 3 && (
                        <div className="text-center pt-4">
                            {/* Profile Circle with Gold Ring */}
                            <div className="relative mb-6 inline-block">
                                <div className="w-32 h-32 rounded-full border border-primary/20 p-1 mx-auto">
                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-lg">
                                        {formData.photo ? (
                                            <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faImage} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-2xl font-serif text-dark mb-2">{formData.name || "Name"}</h2>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">
                                {formData.birthDate ? new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Birth Date"} — {formData.passingDate ? new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Passing Date"}
                            </p>

                            <div className="bg-gray-50 p-6 rounded-2xl mb-8 text-left relative">
                                <FontAwesomeIcon icon={faHeart} className="absolute -top-3 left-6 text-primary text-xl bg-white rounded-full p-1 shadow-sm" />
                                <p className="text-gray-600 text-sm italic font-serif leading-relaxed line-clamp-4">
                                    "{formData.bio || "Their story will appear here..."}"
                                </p>
                            </div>

                            <h3 className="text-xl font-serif text-primary mb-2">Almost there!</h3>
                            <p className="text-gray-500 text-sm mb-8">
                                Your memorial page details are ready. Click <strong>"Launch Memorial Page"</strong> to publish it and share it with friends and family.
                            </p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-gray-500 hover:text-dark font-medium text-sm px-4 py-2 rounded-full hover:bg-gray-50 transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Back
                            </button>
                        ) : (
                            <button onClick={onClose} className="text-gray-400 hover:text-dark text-sm px-4 py-2">
                                Cancel
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="bg-primary text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                            >
                                Continue <FontAwesomeIcon icon={faArrowRight} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                disabled={submitting}
                                className="bg-primary text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 disabled:opacity-70"
                            >
                                {submitting
                                    ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Creating...</>
                                    : <><FontAwesomeIcon icon={faHeart} /> Launch Memorial Page</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateMemorialModal;
