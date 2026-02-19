import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useTributeContext } from '../../context/TributeContext';

const Footer = () => {
    const { settings } = useTributeContext();
    const { t } = useTranslation();

    return (
        <footer className="w-full bg-[#111111] text-white pt-20 pb-10 relative z-10">
            <div className="container mx-auto px-6 text-center">
                {/* Main CTA Section */}
                <div className="max-w-4xl mx-auto bg-[#1A1A1A] border border-white/5 rounded-3xl p-12 md:p-20 relative overflow-visible mt-16 mb-20 text-center shadow-2xl">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                        <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center border-[6px] border-[#111111] shadow-lg">
                            <FontAwesomeIcon icon={faHeart} className="text-xl translate-y-[1px]" />
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight text-white tracking-tight">
                        {t('footer.cta_title_line1')} <br />
                        {t('footer.cta_title_line2')} <span className="italic font-light">{t('footer.cta_title_line2_italic')}</span>
                    </h2>

                    <p className="text-white/60 mb-10 max-w-2xl mx-auto text-lg font-description font-light leading-relaxed">
                        {t('footer.cta_desc')}
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
                        <button className="bg-white text-dark px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all hover:scale-105 flex items-center justify-center gap-2 min-w-[200px]">
                            {t('footer.button_create')}
                            <span className="text-lg">→</span>
                        </button>
                        <button className="bg-transparent border border-white/20 text-white px-8 py-4 rounded-full font-medium hover:bg-white/5 transition-colors min-w-[200px]">
                            {t('footer.button_learn')}
                        </button>
                    </div>

                    <p className="text-white/30 text-xs font-description tracking-wide uppercase">
                        {t('footer.note')}
                    </p>
                </div>

                {/* Footer Links (Simplified) */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Tributtoo" className="max-h-8 w-auto grayscale contrast-125 brightness-150" />
                        ) : (
                            <span className="font-serif text-white font-bold text-lg">Tributtoo</span>
                        )}
                        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors text-white/40 hover:text-white">{t('footer.privacy')}</a>
                        <a href="#" className="hover:text-white transition-colors text-white/40 hover:text-white">{t('footer.terms')}</a>
                        <a href="#" className="hover:text-white transition-colors text-white/40 hover:text-white">{t('footer.contact')}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
