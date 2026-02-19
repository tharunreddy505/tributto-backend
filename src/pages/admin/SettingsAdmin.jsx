import React, { useState } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faSave, faImage } from '@fortawesome/free-solid-svg-icons';

const SettingsAdmin = () => {
    const { settings, updateSettings, showToast } = useTributeContext();
    const [logo, setLogo] = React.useState(settings.logo || '');
    const [siteTitle, setSiteTitle] = React.useState(settings.site_title || '');
    const [siteFavicon, setSiteFavicon] = React.useState(settings.site_favicon || '');
    const [googleTranslateApiKey, setGoogleTranslateApiKey] = React.useState(settings.googleTranslateApiKey || '');
    const [loading, setLoading] = React.useState(false);

    // Sync state when settings load from API
    React.useEffect(() => {
        if (settings.logo && !logo) setLogo(settings.logo);
        if (settings.site_title && !siteTitle) setSiteTitle(settings.site_title);
        if (settings.site_favicon && !siteFavicon) setSiteFavicon(settings.site_favicon);
        if (settings.googleTranslateApiKey && !googleTranslateApiKey) {
            setGoogleTranslateApiKey(settings.googleTranslateApiKey);
        }
    }, [settings.logo, settings.site_title, settings.site_favicon, settings.googleTranslateApiKey]);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSiteFavicon(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const success = await updateSettings({
            logo,
            site_title: siteTitle,
            site_favicon: siteFavicon,
            googleTranslateApiKey
        });
        setLoading(false);
        if (success) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast('Failed to save settings.', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700">Site Appearance</h3>
                    <p className="text-xs text-gray-400 mt-1">Manage your site branding and visual elements.</p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Site Title */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Site Title</label>
                            <p className="text-xs text-gray-500 mb-4">
                                This title will appear in the browser tab and search results.
                            </p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                            <input
                                type="text"
                                value={siteTitle}
                                onChange={(e) => setSiteTitle(e.target.value)}
                                placeholder="e.g. Online memorial page - tributoo.com"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Site Logo</label>
                            <p className="text-xs text-gray-500 mb-4">
                                This logo will appear in the admin dashboard sidebar and the public website navigation bar.
                            </p>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                                onClick={() => document.getElementById('logo-upload').click()}>
                                {logo ? (
                                    <img src={logo} alt="Site Logo" className="max-h-24 object-contain mb-4" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-4 group-hover:bg-gray-300 transition-colors">
                                        <FontAwesomeIcon icon={faImage} size="2x" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="logo-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                                <span className="text-sm font-medium text-primary">
                                    <FontAwesomeIcon icon={faUpload} className="mr-2" />
                                    {logo ? 'Change Logo' : 'Upload Logo'}
                                </span>
                                <p className="text-xs text-gray-400 mt-2">Recommended: PNG or SVG with transparent background</p>
                            </div>
                            {logo && (
                                <button
                                    onClick={() => setSiteFavicon(logo)}
                                    className="text-xs text-gray-500 hover:text-primary underline flex items-center gap-1"
                                >
                                    Use Logo as Favicon
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Favicon Upload */}
                    <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Favicon</label>
                            <p className="text-xs text-gray-500 mb-4">
                                The favicon is the icon shown in the browser tab.
                            </p>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                                onClick={() => document.getElementById('favicon-upload').click()}>
                                {siteFavicon ? (
                                    <img src={siteFavicon} alt="Favicon" className="w-8 h-8 object-contain mb-2" />
                                ) : (
                                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-400 mb-2 group-hover:bg-gray-300 transition-colors">
                                        <FontAwesomeIcon icon={faImage} />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="favicon-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFaviconUpload}
                                />
                                <span className="text-xs font-medium text-primary">
                                    <FontAwesomeIcon icon={faUpload} className="mr-1" />
                                    {siteFavicon ? 'Change Favicon' : 'Upload Favicon'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Google Translate API Key */}
                    <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Google Translate API</label>
                            <p className="text-xs text-gray-500 mb-4">
                                Enter your Google Cloud Translation API Key to enable automatic content translation features.
                            </p>
                        </div>

                        <div className="flex-1 w-full space-y-4">
                            <div className="w-full">
                                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                <input
                                    type="password"
                                    id="apiKey"
                                    value={googleTranslateApiKey}
                                    onChange={(e) => setGoogleTranslateApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    Keep this key secret. It will be used for server-side translation requests.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end items-center gap-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={loading ? faUpload : faSave} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsAdmin;
