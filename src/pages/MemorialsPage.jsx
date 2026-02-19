import React from 'react';
import { useTributeContext } from '../context/TributeContext';
import Layout from '../components/layout/Layout';
import MemorialsGrid from '../components/MemorialsGrid';
import { useTranslation } from 'react-i18next';

const MemorialsPage = () => {
    const { isInitialized } = useTributeContext();
    const { t } = useTranslation();

    if (!isInitialized) {
        return (
            <Layout>
                <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-serif italic">{t('memorials_list.loading')}</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="bg-[#FAF9F6] min-h-screen pt-16 pb-20 font-sans">
                <div className="container mx-auto max-w-4xl px-6">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('memorials_list.title')}</h1>
                        <p className="text-gray-500 font-serif italic text-lg">{t('memorials_list.subtitle')}</p>
                    </div>

                    <MemorialsGrid />
                </div>
            </div>
        </Layout>
    );
};

export default MemorialsPage;
