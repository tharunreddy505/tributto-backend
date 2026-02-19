import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useTributeContext } from '../../context/TributeContext';
import LanguageSwitcher from './LanguageSwitcher';
import useGoogleTranslate from '../../hooks/useGoogleTranslate';

const NavTitle = ({ item }) => {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    // 1. Check for manual translation in the item object (from DB)
    if (item.translations && item.translations[currentLang]) {
        return <>{item.translations[currentLang]}</>;
    }

    // 2. Fall back to automatic translation hook if not primary language
    // We only use the hook if it's not English (assuming English is source)
    // and if there's no manual translation.
    return <TranslatedNavTitle text={item.title} />;
};

const TranslatedNavTitle = ({ text }) => {
    const translated = useGoogleTranslate(text);
    return <>{translated}</>;
};

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { settings, primaryMenu, cart } = useTributeContext();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [menu, setMenu] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            if (token && userData) {
                setUser(JSON.parse(userData));
            } else {
                setUser(null);
            }
        };

        checkAuth();
        // Listen for storage changes (for same-domain tab sync) or manual triggers
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, [location.pathname]); // Re-check on navigation

    // Check if we are on the home page (considering localization and trailing slashes)
    const isHomePage = (() => {
        const path = location.pathname.replace(/\/$/, '') || '/';
        const supportedLangs = ['en', 'de', 'it'];

        // Root path
        if (path === '/') return true;

        // Language root paths (e.g., /en, /de, /it)
        if (supportedLangs.some(lang => path === `/${lang}`)) return true;

        return false;
    })();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Helper to localize URLs
    const getLocalizedUrl = (url) => {
        if (!url) return '#';
        if (url.startsWith('http') || url.startsWith('mailto')) return url;

        const currentLang = i18n.language;
        // If current language is default (en), clean URL. If not, prepend lang.
        // Assuming 'en' is default and doesn't use prefix
        if (currentLang === 'en') return url;

        // Ensure we don't double prefix
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `/${currentLang}${cleanUrl}`;
    };

    useEffect(() => {
        if (primaryMenu && primaryMenu.items) {
            // Nest items based on indent
            const nestedItems = [];
            let currentParent = null;

            primaryMenu.items.forEach(item => {
                if (item.indent === 0) {
                    currentParent = { ...item, children: [] };
                    nestedItems.push(currentParent);
                } else if (currentParent) {
                    currentParent.children.push(item);
                }
            });
            setMenu({ ...primaryMenu, items: nestedItems });
        } else {
            setMenu(null);
        }
    }, [primaryMenu]);

    const navBgClass = isHomePage
        ? (isScrolled ? 'bg-black/90 backdrop-blur-md shadow-lg py-4' : 'bg-transparent py-6')
        : 'bg-black py-4 shadow-lg';

    const navPositionClass = isHomePage ? 'fixed top-0 left-0 w-full' : 'relative w-full';

    return (
        <nav className={`${navPositionClass} z-50 transition-all duration-300 ${navBgClass}`}>
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <Link to={getLocalizedUrl("/")} className="font-serif text-2xl md:text-3xl text-white font-bold tracking-wide">
                    {settings.logo ? (
                        <img src={settings.logo} alt="Tributtoo" className="max-h-12 w-auto" />
                    ) : (
                        "Tributtoo"
                    )}
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-8 text-white/90 font-medium text-sm tracking-wide items-center">
                    {menu && menu.items && menu.items.length > 0 ? (
                        menu.items.map((item, idx) => (
                            item.children && item.children.length > 0 ? (
                                <div key={idx} className="relative group cursor-pointer py-2">
                                    <span className="hover:text-white transition-colors flex items-center gap-1 group-hover:text-primary">
                                        {item.url ? (
                                            <Link to={getLocalizedUrl(item.url)} className="hover:text-white transition-colors">
                                                <NavTitle item={item} />
                                            </Link>
                                        ) : (
                                            <span><NavTitle item={item} /></span>
                                        )}
                                        <svg className="w-3 h-3 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </span>
                                    {/* Dropdown */}
                                    <div className="absolute top-full left-0 mt-0 w-48 bg-white rounded-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top scale-95 group-hover:scale-100 z-[100]">
                                        {item.children.map((child, cIdx) => (
                                            <Link key={cIdx} to={getLocalizedUrl(child.url)} className="block px-4 py-2 text-gray-800 hover:bg-gray-50 hover:text-primary transition-colors text-sm font-medium">
                                                <NavTitle item={child} />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Link key={idx} to={getLocalizedUrl(item.url)} className="hover:text-white transition-colors font-medium border-b-2 border-transparent hover:border-primary pb-0.5">
                                    <NavTitle item={item} />
                                </Link>
                            )
                        ))
                    ) : (
                        <>
                            <Link to={getLocalizedUrl("/memorials")} className="hover:text-white transition-colors underline decoration-primary decoration-2 underline-offset-4">{t('menu.memorials')}</Link>
                            <a href="#" className="hover:text-white transition-colors">{t('menu.features')}</a>
                            <a href="#" className="hover:text-white transition-colors">{t('menu.testimonials')}</a>
                            <a href="#" className="hover:text-white transition-colors">{t('menu.pricing')}</a>
                            <a href="#" className="hover:text-white transition-colors">{t('menu.support')}</a>
                        </>
                    )}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-6">
                    <Link to="/cart" className="relative group text-white/80 hover:text-white transition-colors">
                        <FontAwesomeIcon icon={faShoppingBag} className="text-xl" />
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary text-dark text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </Link>
                    <LanguageSwitcher />
                    {user ? (
                        <Link to="/admin" className="bg-primary text-dark px-6 py-2 rounded-full font-bold text-sm hover:bg-opacity-90 transition-all shadow-lg">
                            Dashboard
                        </Link>
                    ) : (
                        <Link to={getLocalizedUrl("/login")} className="bg-white text-dark px-6 py-2 rounded-full font-medium text-sm hover:bg-opacity-90 transition-all shadow-lg hover:shadow-white/20">
                            {t('menu.login')}
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-4">
                    <Link to="/cart" className="relative text-white/80 mr-2">
                        <FontAwesomeIcon icon={faShoppingBag} />
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary text-dark text-[8px] font-bold w-3 h-3 flex items-center justify-center rounded-full">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </Link>
                    <LanguageSwitcher />
                    <button
                        className="text-white text-2xl focus:outline-none"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-dark/95 backdrop-blur-md py-6 px-6 border-t border-white/10 flex flex-col space-y-4 shadow-xl">
                    {menu && menu.items && menu.items.length > 0 ? (
                        menu.items.map((item, idx) => (
                            <div key={idx} className="space-y-2">
                                <Link to={getLocalizedUrl(item.url)} className="text-white/90 hover:text-white text-lg font-bold block" onClick={() => setIsOpen(false)}>
                                    <NavTitle item={item} />
                                </Link>
                                {item.children && item.children.length > 0 && (
                                    <div className="pl-4 space-y-2 border-l border-white/20 ml-1">
                                        {item.children.map((child, cIdx) => (
                                            <Link key={cIdx} to={getLocalizedUrl(child.url)} className="text-white/60 hover:text-white text-sm block" onClick={() => setIsOpen(false)}>
                                                <NavTitle item={child} />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <>
                            <Link to={getLocalizedUrl("/memorials")} className="text-white/80 hover:text-white text-lg" onClick={() => setIsOpen(false)}>{t('menu.memorials')}</Link>
                            <a href="#" className="text-white/80 hover:text-white text-lg">{t('menu.features')}</a>
                            <a href="#" className="text-white/80 hover:text-white text-lg">{t('menu.testimonials')}</a>
                            <a href="#" className="text-white/80 hover:text-white text-lg">{t('menu.pricing')}</a>
                            <a href="#" className="text-white/80 hover:text-white text-lg">{t('menu.support')}</a>
                        </>
                    )}
                    {user ? (
                        <Link to="/admin" className="bg-primary text-dark text-center py-3 rounded-full font-bold" onClick={() => setIsOpen(false)}>
                            Dashboard
                        </Link>
                    ) : (
                        <Link to={getLocalizedUrl("/login")} className="bg-white text-dark text-center py-3 rounded-full font-medium" onClick={() => setIsOpen(false)}>
                            {t('menu.login')}
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
