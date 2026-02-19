import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faUsers, faClock, faShieldAlt, faStar, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const WhyChoose = () => {
    const { t } = useTranslation();

    const features = [
        { icon: faHeart, key: 'forever' },
        { icon: faUsers, key: 'together' },
        { icon: faClock, key: 'easy' },
        { icon: faShieldAlt, key: 'private' },
        { icon: faStar, key: 'designed' },
        { icon: faGlobe, key: 'share' },
    ];

    return (
        <section className="py-20 bg-dark text-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold mb-4">
                        {t('why_choose.title_line1')} <br />
                        <span className="text-primary italic">{t('why_choose.title_line2')}</span>
                    </h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        {t('why_choose.description')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl hover:shadow-xl transition-shadow text-left">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                                <FontAwesomeIcon icon={feature.icon} className="text-primary text-xl" />
                            </div>
                            <h3 className="text-xl font-bold text-dark mb-3 font-serif">{t(`why_choose.items.${feature.key}.title`)}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed font-description">
                                {t(`why_choose.items.${feature.key}.text`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhyChoose;
