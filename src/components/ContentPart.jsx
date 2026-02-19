import React, { useMemo } from 'react';
import useGoogleTranslate from '../hooks/useGoogleTranslate';
import MemorialsGrid from './MemorialsGrid'; // Assuming this is needed for the shortcode

const ContentPart = ({ html, className }) => {
    // robustly handle style tags by replacing them with placeholders
    const processHtml = useMemo(() => {
        if (!html || typeof html !== 'string') return { cleaned: '', styles: [] };

        try {
            const styles = [];
            // Replace all style tags with placeholders
            const cleaned = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, (match) => {
                styles.push(match);
                return `<!--STYLE_PLACEHOLDER_${styles.length - 1}-->`;
            });
            return { cleaned, styles };
        } catch (e) {
            console.error("Error processing HTML styles:", e);
            return { cleaned: html, styles: [] };
        }
    }, [html]);

    const translatedContent = useGoogleTranslate(processHtml.cleaned);

    // Restore styles into the translated content
    const finalHtml = useMemo(() => {
        // Ensure result is a string before calling includes/replace
        let result = translatedContent;
        if (result === undefined || result === null) result = '';
        if (typeof result !== 'string') result = String(result);

        if (processHtml.styles && processHtml.styles.length > 0) {
            processHtml.styles.forEach((style, index) => {
                const placeholder = `<!--STYLE_PLACEHOLDER_${index}-->`;

                if (result.includes(placeholder)) {
                    result = result.replace(placeholder, style);
                } else {
                    // Fallback: If placeholder is lost/mangled, just prepend the style so layout works
                    // Use a safe delimiter or just append
                    result = style + '\n' + result;
                }
            });
        }
        return result;
    }, [translatedContent, processHtml.styles]);

    return <div className={className} dangerouslySetInnerHTML={{ __html: finalHtml }} />;
};

export const RenderContentWithShortcodes = ({ content }) => {
    if (!content) return null;

    const isVisualBuilder = content.includes('<style>');
    const contentClasses = isVisualBuilder ? "gjs-content" : "prose prose-lg max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 mx-auto max-w-4xl";

    const shortcode = '[memorial_grid]';

    if (!content.includes(shortcode)) {
        return <ContentPart className={contentClasses} html={content} />;
    }

    const parts = content.split(shortcode);

    return (
        <div className={isVisualBuilder ? "gjs-content" : ""}>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part && <ContentPart className={isVisualBuilder ? "" : contentClasses} html={part} />}
                    {index < parts.length - 1 && (
                        <div className="py-12 px-6">
                            <MemorialsGrid />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default ContentPart;
