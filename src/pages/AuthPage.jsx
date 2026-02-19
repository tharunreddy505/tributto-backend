import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEye,
    faEyeSlash,
    faUser,
    faBuilding,
    faUpload,
    faChevronRight,
    faLock,
    faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/layout/Layout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

const AuthPage = ({ mode = 'login' }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(mode === 'login');
    const [role, setRole] = useState('private');
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        companyName: '',
        isVisible: 'No',
        description: '',
        termsAccepted: false,
        logoUrl: null // Added for logo upload
    });
    const [errors, setErrors] = useState({});

    const [successMessage, setSuccessMessage] = useState('');

    const toggleMode = () => setIsLogin(!isLogin);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        const newErrors = {};

        // Username is required if:
        // 1. It's login mode
        // 2. OR It's registration mode AND role is 'private'
        if ((isLogin || role === 'private') && !formData.username) {
            newErrors.username = "Username is required";
        }

        // Company Name is required if:
        // 1. It's registration mode AND role is 'company'
        if (!isLogin && role === 'company' && !formData.companyName) {
            newErrors.companyName = "Company Name is required";
        }

        if (!isLogin && !formData.email) newErrors.email = "Email is required";
        if (!formData.password) newErrors.password = "Password is required";
        if (!isLogin && formData.emailError) newErrors.email = formData.emailError;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin
            ? { username: formData.username, password: formData.password }
            : { ...formData, role };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (!isLogin) {
                    setSuccessMessage("Registration Successful! Redirecting...");
                    setTimeout(() => {
                        navigate('/admin');
                        window.location.reload();
                    }, 1500);
                } else {
                    navigate('/admin');
                    window.location.reload();
                }
            } else {
                const errorMsg = data.error || 'Something went wrong';
                const newErrors = {};

                if (errorMsg.toLowerCase().includes('email')) {
                    newErrors.email = errorMsg;
                }
                if (errorMsg.toLowerCase().includes('username')) {
                    newErrors.username = errorMsg;
                }
                if (errorMsg.toLowerCase().includes('company')) {
                    newErrors.companyName = errorMsg;
                }

                // If no specific field matched, or it's a login error (often generic)
                if (Object.keys(newErrors).length === 0) {
                    if (isLogin) {
                        newErrors.password = errorMsg; // Show generic login failure under password standardly
                        newErrors.username = errorMsg;
                    } else {
                        // For generic registration errors, fallback to email as primary contact field
                        newErrors.email = errorMsg;
                    }
                }

                setErrors(newErrors);
            }
        } catch (err) {
            console.error('Auth error:', err);
            alert('Server connection failed');
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 px-4 flex items-center justify-center">
                <div className="w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 md:p-12 border border-gray-100 relative">
                    {/* Success Message Overlay */}
                    {successMessage && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500 animate-bounce">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
                            <p className="text-gray-500">{successMessage}</p>
                        </div>
                    )}

                    {/* Header Tabs */}
                    <div className="flex gap-6 mb-10 text-xl font-medium">
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`transition-colors ${!isLogin ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                            {t('auth.register')}
                        </button>
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`transition-colors ${isLogin ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                            {t('auth.login')}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isLogin && Object.keys(errors).length > 0 && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
                                <FontAwesomeIcon icon={faExclamationCircle} />
                                <span className="font-medium">{Object.values(errors)[0]}</span>
                            </div>
                        )}
                        {!isLogin && (
                            <div className="space-y-4 mb-8">
                                <label className="block text-gray-700 font-medium">{t('auth.choose_role')}</label>
                                <div className="flex gap-8">
                                    <button
                                        type="button"
                                        onClick={() => setRole('private')}
                                        className="flex items-center gap-3 group"
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${role === 'private' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300'}`}>
                                            {role === 'private' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`font-medium ${role === 'private' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t('auth.role_private')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('company')}
                                        className="flex items-center gap-3 group"
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${role === 'company' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300'}`}>
                                            {role === 'company' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`font-medium ${role === 'company' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t('auth.role_company')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {isLogin ? (
                            /* LOGIN FIELDS */
                            <>
                                <div className="space-y-1 group">
                                    <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">{t('auth.username')}</label>
                                    <div className={`relative border-b transition-all ${errors.username ? 'border-red-500' : 'border-gray-200 group-focus-within:border-[#D4AF37]'}`}>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="w-full py-3 bg-transparent outline-none text-gray-800"
                                            placeholder={t('auth.enter_username')}
                                        />
                                    </div>

                                </div>

                                <div className="space-y-1 group">
                                    <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">{t('auth.password')}</label>
                                    <div className={`relative border-b transition-all ${errors.password ? 'border-red-500' : 'border-gray-200 group-focus-within:border-[#D4AF37]'}`}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full py-3 pr-10 bg-transparent outline-none text-gray-800"
                                            placeholder={t('auth.enter_password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
                                        >
                                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                        </button>
                                    </div>

                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center group-hover:border-[#D4AF37] transition-colors">
                                            <input type="checkbox" className="hidden" />
                                            {/* Custom checkbox checkmark logic if needed */}
                                        </div>
                                        <span className="text-sm text-gray-500">{t('auth.remember_me')}</span>
                                    </label>
                                    <button type="button" className="text-sm text-[#D4AF37] font-medium hover:underline flex items-center gap-2">
                                        <FontAwesomeIcon icon={faLock} size="xs" />
                                        {t('auth.forgot_password')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* REGISTER FIELDS */
                            <>
                                <div className="space-y-1 group">
                                    <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">
                                        {role === 'private' ? t('auth.choose_username_company') : t('auth.enter_company_name')}
                                    </label>
                                    <div className={`relative border-b transition-all ${errors.username || errors.companyName ? 'border-red-500' : 'border-gray-200 group-focus-within:border-[#D4AF37]'}`}>
                                        <input
                                            type="text"
                                            name={role === 'private' ? "username" : "companyName"}
                                            value={role === 'private' ? formData.username : formData.companyName}
                                            onChange={async (e) => {
                                                handleInputChange(e);
                                                const value = e.target.value;
                                                const isUsername = role === 'private';

                                                if (isUsername && value.length > 2) {
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/auth/check-username`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ username: value })
                                                        });
                                                        const data = await res.json();
                                                        if (data.exists) {
                                                            setErrors(prev => ({ ...prev, username: 'Username already exists' }));
                                                        } else {
                                                            setErrors(prev => ({ ...prev, username: null }));
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }
                                            }}
                                            className="w-full py-3 bg-transparent outline-none text-gray-800"
                                        />
                                    </div>
                                    {!isLogin && (errors.username || errors.companyName) && <p className="text-red-500 text-xs mt-1 text-left">{errors.username || errors.companyName}</p>}
                                </div>

                                <div className="space-y-1 group">
                                    <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">{t('auth.email')}</label>
                                    <div className={`relative border-b transition-all ${errors.email || formData.emailError ? 'border-red-500' : 'border-gray-200 group-focus-within:border-[#D4AF37]'}`}>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={async (e) => {
                                                handleInputChange(e);
                                                const email = e.target.value;
                                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                                                if (email) {
                                                    if (!emailRegex.test(email)) {
                                                        setFormData(prev => ({ ...prev, emailError: 'Please enter a valid email address' }));
                                                        return;
                                                    }

                                                    try {
                                                        const res = await fetch(`${API_URL}/api/auth/check-email`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ email })
                                                        });
                                                        const data = await res.json();
                                                        if (data.exists) {
                                                            setFormData(prev => ({ ...prev, emailError: 'User with this email already exists' }));
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
                                            className="w-full py-3 bg-transparent outline-none text-gray-800"
                                        />
                                    </div>
                                    {!isLogin && (errors.email || formData.emailError) && <p className="text-red-500 text-xs mt-1 text-left">{errors.email || formData.emailError}</p>}
                                </div>

                                <div className="space-y-1 group">
                                    <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">
                                        {role === 'private' ? t('auth.password') : t('auth.password')}
                                    </label>
                                    <div className={`relative border-b transition-all ${errors.password ? 'border-red-500' : 'border-gray-200 group-focus-within:border-[#D4AF37]'}`}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full py-3 pr-10 bg-transparent outline-none text-gray-800"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
                                        >
                                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                    {!isLogin && errors.password && <p className="text-red-500 text-xs mt-1 text-left">{errors.password}</p>}
                                </div>

                                {role === 'company' && (
                                    <>
                                        <div className="space-y-1 group">
                                            <label className="text-sm font-medium text-gray-500 pl-1">{t('auth.visible')}</label>
                                            <div className="relative border-b border-gray-200 transition-all">
                                                <select
                                                    name="isVisible"
                                                    value={formData.isVisible}
                                                    onChange={handleInputChange}
                                                    className="w-full py-3 bg-transparent outline-none text-gray-800 appearance-none"
                                                >
                                                    <option value="No">No</option>
                                                    <option value="Yes">Yes</option>
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <FontAwesomeIcon icon={faChevronRight} rotation={90} className="text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-gray-500 pl-1">{t('auth.upload_logo')}</label>
                                            <div
                                                onClick={() => document.getElementById('logo-upload').click()}
                                                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer group/upload relative overflow-hidden ${errors.logo ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-[#D4AF37]'}`}
                                            >
                                                <input
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                                                setErrors(prev => ({ ...prev, logo: "File size should be less than 5MB" }));
                                                                return;
                                                            }
                                                            if (!file.type.startsWith('image/')) {
                                                                setErrors(prev => ({ ...prev, logo: "Please upload an image file" }));
                                                                return;
                                                            }

                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData(prev => ({ ...prev, logoUrl: reader.result }));
                                                                setErrors(prev => ({ ...prev, logo: null }));
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />

                                                {formData.logoUrl ? (
                                                    <div className="relative w-full h-full min-h-[100px] flex items-center justify-center">
                                                        <img src={formData.logoUrl} alt="Logo Preview" className="max-h-32 object-contain" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                                                            <p className="text-white text-xs font-bold">Click to Change</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center rounded-xl mb-4 group-hover/upload:scale-110 transition-transform">
                                                            <FontAwesomeIcon icon={faUpload} className="text-[#D4AF37]" />
                                                        </div>
                                                        <p className="text-xs text-gray-400 mb-2">Maximum file size: 5MB</p>
                                                    </>
                                                )}
                                            </div>
                                            {!isLogin && errors.logo && <p className="text-red-500 text-xs mt-1 text-left">{errors.logo}</p>}
                                        </div>

                                        <div className="space-y-1 group">
                                            <label className="text-sm font-medium text-gray-500 pl-1 transition-colors group-focus-within:text-[#D4AF37]">{t('auth.description_placeholder')}</label>
                                            <div className="relative border-b border-gray-200 group-focus-within:border-[#D4AF37] transition-all">
                                                <textarea
                                                    name="description"
                                                    rows="3"
                                                    value={formData.description}
                                                    onChange={handleInputChange}
                                                    className="w-full py-3 bg-transparent outline-none text-gray-800 resize-none"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 space-y-4">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            name="termsAccepted"
                                            checked={formData.termsAccepted}
                                            onChange={handleInputChange}
                                            className="mt-1"
                                            required
                                        />
                                        <span className="text-sm text-gray-600 leading-relaxed">
                                            {t('auth.terms_agree')} <span className="text-[#D4AF37] font-semibold hover:underline">{t('auth.terms_link')}</span>.
                                        </span>
                                    </label>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        {t('auth.privacy_text')} <span className="text-[#D4AF37] font-semibold hover:underline">{t('auth.privacy_link')}</span>.
                                    </p>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#E3D190] hover:bg-[#D4AF37] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-8 uppercase tracking-wider"
                        >
                            <FontAwesomeIcon icon={isLogin ? faUser : faUser} />
                            {isLogin ? t('auth.login') : t('auth.register')}
                        </button>

                        <p className="text-center text-gray-500 text-sm mt-8">
                            {t('auth.try_now')}
                        </p>
                    </form>
                </div>
            </div>
        </Layout >
    );
};

export default AuthPage;
