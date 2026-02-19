import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import howItWorksImage from '../../assets/images/HowItWorks.png';

const MemorialCreation = () => {
    const { t } = useTranslation();
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-dark mb-4">
                        {t('creation.title_line1')} <br />
                        <span className="text-primary italic">{t('creation.title_line2')}</span>
                    </h2>
                    <p className="text-gray-600">
                        {t('creation.description')}
                    </p>
                </div>

                <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer">
                    <img
                        src={howItWorksImage}
                        alt="How it works"
                        className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                        <FontAwesomeIcon icon={faPlayCircle} className="text-7xl text-white drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300 opacity-90" />
                    </div>
                </div>

                <div className="text-center mt-12 text-gray-500 text-sm">
                    {t('creation.trust_text')}
                </div>
            </div>
        </section>
    );
};

export default MemorialCreation;
