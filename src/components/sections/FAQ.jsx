import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className={`transition-all duration-300 border rounded-2xl overflow-hidden ${isOpen ? 'border-primary shadow-md' : 'border-gray-100 shadow-sm'}`}>
            <button
                className="w-full flex justify-between items-center px-8 py-6 text-left focus:outline-none transition-colors hover:bg-gray-50/50"
                onClick={onClick}
            >
                <span className={`text-lg font-medium font-description transition-colors ${isOpen ? 'text-primary' : 'text-dark'}`}>{question}</span>
                <span className={`ml-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                    <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-8 pb-8 pt-0 text-gray-600 leading-relaxed font-description border-t border-gray-100/50 mt-2">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const FAQ = () => {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState(null);

    const questionsKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];

    const handleClick = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-dark mb-4">
                        {t('faq.title_line1')} <br />
                        <span className="text-primary italic">{t('faq.title_line2')}</span>
                    </h2>
                    <p className="text-gray-500 text-sm font-description">
                        {t('faq.description')}
                    </p>
                </div>

                <div className="space-y-4">
                    {questionsKeys.map((key, index) => (
                        <div key={index}>
                            <FAQItem
                                question={t(`faq.questions.${key}.q`)}
                                answer={t(`faq.questions.${key}.a`)}
                                isOpen={openIndex === index}
                                onClick={() => handleClick(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
