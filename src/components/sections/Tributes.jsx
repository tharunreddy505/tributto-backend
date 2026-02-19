import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useTributeContext } from '../../context/TributeContext';

const Tributes = () => {
    const { tributes } = useTributeContext();
    const { t } = useTranslation();

    return (
        <section id="tributes" className="py-20 bg-light">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-dark mb-4">
                        {t('tributes.title_line1')} <br />
                        <span className="text-primary italic">{t('tributes.title_line2')}</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        {t('tributes.description')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {tributes.map((tribute) => (
                        <div key={tribute.id} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-start">
                            {/* Top Section: Image + Name/Date */}
                            <div className="flex items-center gap-6 mb-6 w-full">
                                <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                                    <img
                                        src={tribute.image}
                                        alt={tribute.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-2xl text-dark mb-1">{tribute.name}</h3>
                                    <p className="text-sm text-primary font-medium">{tribute.dates}</p>
                                </div>
                            </div>

                            {/* Bottom Section: Description + Link */}
                            <div className="w-full">
                                <div
                                    className="text-gray-600 text-base line-clamp-2 leading-relaxed mb-4 italic rich-text-preview"
                                    dangerouslySetInnerHTML={{ __html: `&ldquo;${tribute.text}&rdquo;` }}
                                />
                                <Link to={`/memorial/${tribute.slug || tribute.id}`} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                                    {t('tributes.view_memorial')} <FontAwesomeIcon icon={faHeart} className="text-xs" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Tributes;
