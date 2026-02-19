import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown } from '@fortawesome/free-solid-svg-icons';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const languages = [
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'it', label: 'Italiano', flag: '🇮🇹' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
    ];

    const changeLanguage = (lng) => {
        // Close dropdown
        setIsOpen(false);

        // Current path
        const currentPath = location.pathname;

        // Clean path of existing language prefix
        // Regex matches /de, /it at start of string, followed by / or end of string
        let cleanPath = currentPath.replace(/^\/(de|it)(\/|$)/, '/');

        // If switching to default language (en), navigate to clean path
        if (lng === 'en') {
            navigate(cleanPath);
        } else {
            // For other languages, prepend language code
            // Ensure we don't double slash if cleanPath is already /
            const newPath = cleanPath === '/' ? `/${lng}` : `/${lng}${cleanPath}`;
            navigate(newPath);
        }

        // Also change i18n state immediately for responsiveness
        i18n.changeLanguage(lng);
    };

    const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

    // Close dropdown when complying outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-white/90 hover:text-primary transition-colors px-3 py-1.5 rounded-full text-sm font-medium"
            >
                <span className="text-lg">{currentLanguage.flag}</span>
                <span className="hidden lg:inline">{currentLanguage.label}</span>
                <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-black border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden transform origin-top-right animate-fadeIn">
                    {languages.map((lng) => (
                        <button
                            key={lng.code}
                            onClick={() => changeLanguage(lng.code)}
                            className={`flex items-center gap-3 w-full px-5 py-3 text-left text-sm transition-all hover:bg-white/10 ${i18n.language === lng.code
                                ? 'text-primary font-bold bg-white/5'
                                : 'text-gray-300'
                                }`}
                        >
                            <span className="text-xl">{lng.flag}</span>
                            <span className="font-serif tracking-wide">{lng.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
