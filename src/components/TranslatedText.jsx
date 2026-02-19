import React from 'react';
import useGoogleTranslate from '../hooks/useGoogleTranslate';

const TranslatedText = ({ text, isHtml = false, className = '' }) => {
    const translated = useGoogleTranslate(text);

    if (isHtml) {
        return <div className={className} dangerouslySetInnerHTML={{ __html: translated }} />;
    }

    return <span className={className}>{translated}</span>;
};

export default TranslatedText;
