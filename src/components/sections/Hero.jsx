import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import heroImage from '../../assets/images/hero-image.png';

const Hero = ({ onOpenModal }) => {
    const { t } = useTranslation();

    return (
        <section className="relative h-screen flex items-center justify-center text-white overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={heroImage}
                    alt={t('hero.title_line1')}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div> {/* Overlay */}
            </div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 leading-tight">
                    {t('hero.title_line1')} <br />
                    <span className="text-primary italic custom-text-primary">{t('hero.title_line2')}</span>
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
                    {t('hero.subtitle')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={onOpenModal}
                        className="bg-white text-dark px-8 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all flex items-center gap-2"
                    >
                        {t('hero.cta_create')}
                    </button>
                    <button className="flex items-center gap-2 text-white border border-white/30 px-8 py-3 rounded-full hover:bg-white/10 transition-all">
                        <div className="w-8 h-8 rounded-full bg-white text-dark flex items-center justify-center text-xs">
                            <FontAwesomeIcon icon={faPlay} className="ml-0.5" />
                        </div>
                        {t('hero.cta_watch')}
                    </button>
                </div>
            </div>

            {/* Animated Scroll Indicator */}
            <button
                onClick={() => document.getElementById('tributes')?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 group transition-all duration-300 z-20"
                aria-label="Scroll down"
            >
                <span className="text-[10px] uppercase tracking-widest text-white/40 group-hover:text-primary transition-colors mb-1 font-bold">
                    Scroll
                </span>
                <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1 group-hover:border-primary transition-colors">
                    <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-scroll group-hover:bg-primary"></div>
                </div>
            </button>
        </section>
    );
};

export default Hero;
