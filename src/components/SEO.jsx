import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, ogImage, canonicalUrl }) => {
    const defaultTitle = "Tributoo - Digital Memorials";
    const defaultDescription = "Create everlasting digital memorials for your loved ones.";

    const finalTitle = title ? `${title} | Tributoo` : defaultTitle;
    const finalDescription = description || defaultDescription;

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            {ogImage && <meta property="og:image" content={ogImage} />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDescription} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Helmet>
    );
};

export default SEO;
