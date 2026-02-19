import React, { useMemo } from 'react';
import { useTributeContext } from '../context/TributeContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import useGoogleTranslate from '../hooks/useGoogleTranslate';

const TranslatedText = ({ text }) => {
    const translated = useGoogleTranslate(text);
    return <>{translated}</>;
};

const BlogPage = () => {
    const { posts, isInitialized } = useTributeContext();
    const { t, i18n } = useTranslation();

    const getLocalizedUrl = (url) => {
        if (!url) return '#';
        const currentLang = i18n.language;
        if (currentLang === 'en') return url;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `/${currentLang}${cleanUrl}`;
    };

    const publishedPosts = useMemo(() => {
        if (!posts) return [];
        return posts.filter(post => post.status === 'published');
    }, [posts]);

    if (!isInitialized) {
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-serif italic">{t('loading', 'Loading...')}</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-20 px-6 font-sans">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('blog.title', 'Our Blog')}</h1>
                        <p className="text-gray-500 font-serif italic text-lg">{t('blog.subtitle', 'Latest news and updates')}</p>
                    </div>

                    {publishedPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {publishedPosts.map(post => (
                                <Link key={post.id} to={getLocalizedUrl(`/post/${post.slug}`)} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100">
                                    <div className="h-48 overflow-hidden bg-gray-200 relative">
                                        {post.featured_image ? (
                                            <img
                                                src={post.featured_image}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-dark shadow-sm">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                            <TranslatedText text={post.title} />
                                        </h3>
                                        <div className="text-gray-500 text-sm mb-4 flex-1 line-clamp-3 overflow-hidden text-ellipsis">
                                            {/* Strip HTML tags safely for excerpt */}
                                            <TranslatedText text={post.content?.replace(/<[^>]+>/g, '').substring(0, 150) + '...'} />
                                        </div>
                                        <span className="text-primary font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                            {t('blog.read_more', 'Read Article')}
                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('blog.no_posts', 'No posts yet')}</h3>
                            <p className="text-gray-500">{t('blog.check_back', 'Check back soon for updates.')}</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default BlogPage;
