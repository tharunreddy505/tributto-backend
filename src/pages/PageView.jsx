import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import Layout from '../components/layout/Layout';
import { RenderContentWithShortcodes } from '../components/ContentPart';
import TranslatedText from '../components/TranslatedText';

class PageErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <Layout>
                    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center pt-32">
                        <div className="text-center p-8">
                            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                            <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-lg text-sm">
                                {this.state.error?.toString()}
                            </pre>
                        </div>
                    </div>
                </Layout>
            );
        }
        return this.props.children;
    }
}

const PageViewContent = () => {
    const { slug } = useParams();
    const { pages, isInitialized } = useTributeContext();

    const page = useMemo(() => {
        if (!pages || !slug) return null;

        // Normalize slug for comparison (remove leading slashes)
        const normalizedUrlSlug = slug.replace(/^\/+/, '');

        return pages.find(p => {
            const normalizedPageSlug = (p.slug || '').replace(/^\/+/, '');
            return normalizedPageSlug === normalizedUrlSlug && p.status === 'published';
        });
    }, [pages, slug]);

    if (!isInitialized) {
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (!page) {
        console.warn("Page not found for slug:", slug, "Pages available:", pages.length);
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center pt-32">
                    <div className="text-center">
                        <h1 className="text-4xl font-serif mb-4">Page Not Found</h1>
                        <p className="text-gray-500">The page "{slug}" could not be found.</p>
                        <p className="text-xs text-gray-400 mt-4">Loaded Pages: {pages.length}</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-20">
                <div className="container mx-auto max-w-5xl">
                    <h1 className="text-4xl md:text-5xl font-serif text-dark mb-12 text-center px-6">
                        <TranslatedText text={page.title} />
                    </h1>

                    <div className="w-full px-4">
                        <RenderContentWithShortcodes content={page.content} />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const PageView = () => (
    <PageErrorBoundary>
        <PageViewContent />
    </PageErrorBoundary>
);

export default PageView;
