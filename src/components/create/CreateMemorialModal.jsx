import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload, faArrowRight, faArrowLeft, faImage, faVideo, faHeart, faCalendarAlt, faPlay, faLink } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';

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

                // Max width/height 800px
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

                // Compress to JPEG with 0.7 quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

const CreateMemorialModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { tributes, addTribute } = useTributeContext();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        passingDate: '',
        photo: null,
        bio: '',
        images: [],
        videos: [],
        videoUrls: ['']
    });
    const [errors, setErrors] = useState({});

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

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await compressImage(file);
                setFormData(prev => ({
                    ...prev,
                    photo: base64
                }));
            } catch (error) {
                console.error("Error converting file to base64:", error);
            }
        }
    };

    const handleNext = () => {
        if (step === 1) {
            const newErrors = {};
            if (!formData.name) newErrors.name = "Full Name is required";
            if (!formData.birthDate) newErrors.birthDate = "Date of Birth is required";
            if (!formData.passingDate) newErrors.passingDate = "Passing Date is required";
            if (!formData.email) newErrors.email = "Email is required";
            if (formData.emailError) newErrors.email = formData.emailError;

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleFinish = () => {
        // Generate a unique slug for demo purposes
        const slug = formData.name ?
            formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : 'memorial-' + Date.now();

        // Create new tribute object for the main list
        const birthDateFormatted = new Date(formData.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const passingDateFormatted = new Date(formData.passingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Calculate next sequential ID, ignoring large timestamp IDs if mixed
        const nextId = tributes.length > 0
            ? Math.max(0, ...tributes.map(t => Number(t.id)).filter(id => id < 1000000000000)) + 1
            : 1;

        const newTribute = {
            ...formData,
            id: nextId,
            createdAt: new Date().toISOString(),
            dates: `${birthDateFormatted} - ${passingDateFormatted}`,
            text: formData.bio,
            image: formData.photo,
            slug,
            videoUrls: formData.videoUrls.filter(url => url && url.trim() !== '')
        };

        addTribute(newTribute);

        navigate(`/memorial/${newTribute.slug || newTribute.id}`, { state: { memorialData: newTribute } });
        onClose();
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
                                <span className="text-xs font-bold tracking-widest text-primary uppercase">Profile Photo</span>
                                <div className="mt-4 flex justify-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner hover:shadow-md transition-shadow">
                                            {formData.photo ? (
                                                <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FontAwesomeIcon icon={faUpload} className="text-gray-300 text-2xl" />
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handlePhotoUpload}
                                            accept="image/*"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">Click to upload</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Full Name <span className="text-primary">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-dark placeholder-gray-300`}
                                        placeholder="Eleanor Rose Mitchell"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1 text-left">{errors.name}</p>}
                                    <p className="text-[10px] text-gray-400 mt-1">The name they were known by</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Date of Birth <span className="text-primary">*</span></label>
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
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Passed Away <span className="text-primary">*</span></label>
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
                                    <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">My Email <span className="text-primary">*</span></label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={async (e) => {
                                            handleInputChange(e);
                                            const email = e.target.value;
                                            if (email && email.includes('@')) {
                                                try {
                                                    const res = await fetch(`${API_URL}/api/auth/check-email`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ email })
                                                    });
                                                    const data = await res.json();
                                                    if (data.exists) {
                                                        setFormData(prev => ({ ...prev, emailError: 'This email is already registered. Please login to create a memorial.' }));
                                                    } else {
                                                        setFormData(prev => ({ ...prev, emailError: null }));
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            } else {
                                                setFormData(prev => ({ ...prev, emailError: null }));
                                            }
                                        }}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.email || formData.emailError ? 'border-red-500' : 'border-gray-200'} focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-dark placeholder-gray-300`}
                                        placeholder="your@email.com"
                                    />
                                    {(errors.email || formData.emailError) && <p className="text-red-500 text-xs mt-1 text-left">{errors.email || formData.emailError}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Story */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold font-serif text-dark text-center">Life Story</h3>
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    className="w-full h-64 bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-600 leading-relaxed font-description"
                                    placeholder="Take your time to tell what made them so special... their childhood, their passions, how they touched other people's lives..."
                                ></textarea>
                            </div>
                            <p className="text-center text-xs text-gray-400">Write from the heart — there is no right or wrong.</p>

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
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length > 0) {
                                                        try {
                                                            const promises = files.map(file => compressImage(file));
                                                            const base64Images = await Promise.all(promises);
                                                            setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...base64Images] }));
                                                        } catch (error) {
                                                            console.error("Error converting images:", error);
                                                        }
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
                                                {formData.images.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <FontAwesomeIcon icon={faTimes} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Videos Section */}
                                    <div className="space-y-3">
                                        <div
                                            onClick={() => document.getElementById('video-upload').click()}
                                            className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:text-primary transition-all h-32 relative group bg-white"
                                        >
                                            <input
                                                id="video-upload"
                                                type="file"
                                                multiple
                                                accept="video/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length > 0) {
                                                        try {
                                                            const promises = files.map(file => fileToBase64(file));
                                                            const base64Videos = await Promise.all(promises);
                                                            setFormData(prev => ({ ...prev, videos: [...(prev.videos || []), ...base64Videos] }));
                                                        } catch (error) {
                                                            console.error("Error converting videos:", error);
                                                        }
                                                    }
                                                }}
                                            />
                                            <FontAwesomeIcon icon={faVideo} className="text-xl mb-2 text-gray-300 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-medium text-dark group-hover:text-primary transition-colors">
                                                Add Videos
                                            </span>
                                        </div>

                                        {/* Videos Preview */}
                                        {formData.videos && formData.videos.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {formData.videos.map((vid, idx) => (
                                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group bg-black">
                                                        <video src={vid} className="w-full h-full object-cover opacity-80" />
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <FontAwesomeIcon icon={faPlay} className="text-white/50 text-xs" />
                                                        </div>
                                                        <button
                                                            onClick={() => setFormData(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== idx) }))}
                                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                                        >
                                                            <FontAwesomeIcon icon={faTimes} />
                                                        </button>
                                                    </div>
                                                ))}
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

                            <h3 className="text-xl font-serif text-primary mb-2">Tada...!!</h3>
                            <p className="text-gray-500 text-sm mb-8">Your memorial page is ready.</p>
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
                                className="bg-primary text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                            >
                                Preview Page <FontAwesomeIcon icon={faPlay} className="text-xs" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateMemorialModal;
