import React, { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import useGoogleTranslate from '../hooks/useGoogleTranslate';

const TranslatedText = ({ text }) => {
    const translated = useGoogleTranslate(text);
    return <>{translated}</>;
};

const ContentPart = ({ html, className, isVisualBuilder }) => {
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
                    result = style + '\n' + result;
                }
            });
        }
        return result;
    }, [translatedContent, processHtml.styles]);

    return <div className={className} dangerouslySetInnerHTML={{ __html: finalHtml }} />;
};

const PostView = () => {
    const { slug } = useParams();
    const { posts, isInitialized } = useTributeContext();
    const { t, i18n } = useTranslation();

    const getLocalizedUrl = (url) => {
        if (!url) return '#';
        const currentLang = i18n.language;
        if (currentLang === 'en') return url;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `/${currentLang}${cleanUrl}`;
    };

    const post = useMemo(() => {
        if (!posts || !slug) return null;
        // Normalize slug for comparison (remove leading slashes if any)
        const normalizedUrlSlug = slug.replace(/^\/+/, '');

        return posts.find(p => {
            const normalizedPostSlug = (p.slug || '').replace(/^\/+/, '');
            return normalizedPostSlug === normalizedUrlSlug && p.status === 'published';
        });
    }, [posts, slug]);

    if (!isInitialized) {
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (!post) {
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center pt-32">
                    <div className="text-center">
                        <h1 className="text-4xl font-serif mb-4">{t('not_found.title', 'Post Not Found')}</h1>
                        <p className="text-gray-500">{t('not_found.message', 'The requested post could not be found.')}</p>
                        <Link to={getLocalizedUrl("/blog")} className="mt-8 inline-block px-6 py-2 bg-primary text-white rounded font-bold hover:bg-opacity-90 transition-all">
                            {t('blog.back_to_blog', 'Back to Blog')}
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const isVisualBuilder = post.content?.includes('<style>');
    const contentClasses = isVisualBuilder ? "gjs-content" : "prose prose-lg max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 mx-auto max-w-4xl";

    return (
        <Layout>
            <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-20">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link to={getLocalizedUrl("/blog")} className="inline-flex items-center text-gray-500 hover:text-primary transition-colors mb-8 font-medium text-sm group">
                        <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        {t('blog.back', 'Back to Blog')}
                    </Link>

                    {post.featured_image && (
                        <div className="mb-12 rounded-2xl overflow-hidden shadow-lg h-[400px] w-full relative group">
                            <img
                                src={post.featured_image}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-6 left-8 text-white">
                                <span className="bg-primary px-3 py-1 rounded text-xs font-bold uppercase tracking-wide mb-2 inline-block shadow-md">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="text-center mb-8">
                        {post.categories && post.categories.length > 0 && (
                            <div className="flex justify-center gap-2 mb-4">
                                {post.categories.map((cat, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">{cat}</span>
                                ))}
                            </div>
                        )}
                        <h1 className="text-4xl md:text-5xl font-serif text-dark mb-4 leading-tight">
                            <TranslatedText text={post.title} />
                        </h1>
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex justify-center gap-2 mt-4 flex-wrap">
                                {post.tags.map((tag, i) => (
                                    <span key={i} className="text-primary text-sm font-medium">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-full">
                        <ContentPart
                            className={contentClasses}
                            html={post.content}
                            isVisualBuilder={isVisualBuilder}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PostView;
