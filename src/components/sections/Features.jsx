import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfinity, faLock, faShareNodes, faImages, faCommentDots, faCalendarAlt, faCheckCircle, faAward } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const Features = () => {
    const { t } = useTranslation();

    const features = [
        { icon: faInfinity, key: 'unlimited' },
        { icon: faLock, key: 'privacy' },
        { icon: faShareNodes, key: 'sharing' },
        { icon: faImages, key: 'galleries' },
        { icon: faCommentDots, key: 'messages' },
        { icon: faCalendarAlt, key: 'dates' },
        { icon: faCheckCircle, key: 'no_ads' },
        { icon: faAward, key: 'premium' },
    ];

    return (
        <section className="py-24 bg-dark text-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-serif font-bold mb-4">
                        {t('features.title_line1')} <br />
                        <span className="text-primary italic">{t('features.title_line2')}</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white text-dark p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                                <FontAwesomeIcon icon={feature.icon} className="text-primary" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 font-serif">{t(`features.items.${feature.key}.title`)}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed font-description">
                                {t(`features.items.${feature.key}.desc`)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-3 gap-8 mt-24 text-center border-t border-white/10 pt-12 max-w-4xl mx-auto">
                    <div>
                        <div className="text-3xl font-bold text-primary mb-1 font-serif">50,000+</div>
                        <div className="text-xs text-white/40 uppercase tracking-widest font-sans">{t('features.stats.created')}</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary mb-1 font-serif">99.9%</div>
                        <div className="text-xs text-white/40 uppercase tracking-widest font-sans">{t('features.stats.uptime')}</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary mb-1 font-serif">24/7</div>
                        <div className="text-xs text-white/40 uppercase tracking-widest font-sans">{t('features.stats.support')}</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
