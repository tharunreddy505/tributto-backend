import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faQuoteLeft, faImage, faBookOpen, faPlay, faPen, faShareNodes, faCopy, faGlobe, faLink, faTimes } from '@fortawesome/free-solid-svg-icons';
import { QRCodeCanvas } from 'qrcode.react';
import { useTributeContext } from '../context/TributeContext';
import { useTranslation } from 'react-i18next';
import TranslatedText from '../components/TranslatedText';
import Navbar from '../components/layout/Navbar';

const MemorialPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const { tributes, incrementViewCount, updateTribute, addComment, isInitialized, settings } = useTributeContext();
    const location = useLocation();
    const navigate = useNavigate();
    const viewTracked = useRef(false);

    const [isCondolenceModalOpen, setIsCondolenceModalOpen] = useState(false);
    const [condolenceForm, setCondolenceForm] = useState({ name: '', comment: '' });

    // Find tribute from context (handles persisted data)
    const tribute = tributes.find(t => String(t.id) === id || t.slug === id);

    console.log("Memory Page Debug - ID:", id, "Initialized:", isInitialized);
    console.log("Tribute Found:", !!tribute);
    if (tribute) {
        console.log("Images:", tribute.images?.length, "Videos:", tribute.videos?.length);
    }

    const { memorialData } = location.state || {}; // Fallback if navigated with state

    const rawData = tribute || memorialData;

    const data = {
        name: rawData?.name || "Eleanor Rose Mitchell",
        birthDate: rawData?.birthDate || "1945-05-03",
        passingDate: rawData?.passingDate || "2026-01-15",
        bio: rawData?.bio || rawData?.text || t('memorial_page.bio_fallback'),
        photo: rawData?.photo || rawData?.image || null,
        slug: rawData?.slug || "eleanor-rose-mitchell",
        images: rawData?.images || [],
        videos: rawData?.videos || [],
        videoUrls: (rawData?.videoUrls || []).filter(url => url && url.trim() !== ''),
        comments: rawData?.comments || [],
        coverUrl: rawData?.coverUrl || null,
        id: rawData?.id || 'demo'
    };

    const isDemo = !tribute && !memorialData;

    // Reset view tracking when ID changes
    useEffect(() => {
        viewTracked.current = false;
        window.scrollTo(0, 0);
    }, [id]);

    // Increment view count once per session when tribute is available
    useEffect(() => {
        if (tribute && !viewTracked.current) {
            incrementViewCount(String(tribute.id));
            viewTracked.current = true;
            document.title = `${tribute.name} | Tributtoo`;
        }
    }, [tribute, id, incrementViewCount]);

    // Reset title on unmount or change
    useEffect(() => {
        return () => {
            document.title = 'Tributtoo';
        };
    }, []);

    // Show loading if context not initialized
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-serif lowercase italic">{t('memorial_page.loading')}</p>
                </div>
            </div>
        );
    }

    const copyToClipboard = () => {
        const url = `${window.location.origin}/memorial/${data.slug || data.id || id || 'demo'}`;
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    };

    const handleCondolenceSubmit = (e) => {
        e.preventDefault();
        if (!condolenceForm.name || !condolenceForm.comment) return;

        if (tribute) {
            // Use context function
            addComment(tribute.id, {
                name: condolenceForm.name,
                text: condolenceForm.comment
            });
        } else {
            // Demo mode logic
            alert("This is a demo page. Your message would appear in the guestbook.");
        }

        setCondolenceForm({ name: '', comment: '' });
        setIsCondolenceModalOpen(false);
    };

    // Safe name split for display
    const firstName = data?.name?.split(' ')[0] || "Eleanor";

    // Prepare comments to display: use tribute comments if exist, otherwise mockup defaults
    const displayComments = (data.comments && data.comments.length > 0) ? data.comments : [
        { name: "Sarah Mitchell", date: "January 20, 2026", text: t('memorial_page.demo_comment_0_text') },
        { name: "Michael Chen", date: "January 18, 2026", text: t('memorial_page.demo_comment_1_text') },
        { name: "Rebecca Thompson", date: "January 17, 2026", text: t('memorial_page.demo_comment_2_text') },
        { name: "David Mitchell", date: "January 16, 2026", text: t('memorial_page.demo_comment_3_text') }
    ];

    return (
        <div className="bg-[#FAF9F6] min-h-screen font-sans selection:bg-primary/30 text-dark">
            {/* Navigation (Transparent on dark hero) */}
            {/* Navigation */}
            <Navbar />

            {/* Hero Section - Dark & Elegant */}
            <header className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden bg-[#111111]">
                {/* Custom Cover Background */}
                {data.coverUrl && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={data.coverUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/80 via-[#111111]/60 to-[#111111]"></div>
                    </div>
                )}

                {/* Decorative background circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none"></div>

                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    {/* Profile Image - Centered Circular */}
                    <div className="relative mb-10 inline-block">
                        <div className="w-56 h-56 rounded-full p-1 border border-primary/40 mx-auto relative shadow-2xl">
                            {/* Gold ring internal */}
                            <div className="w-full h-full rounded-full border-[3px] border-[#111111] overflow-hidden relative z-10">
                                <img
                                    src={data.photo || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2576&auto=format&fit=crop"}
                                    alt={data.name}
                                    className="w-full h-full object-cover grayscale contrast-110"
                                />
                            </div>
                            {/* Heart Icon Badge */}
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#111111] p-1.5 rounded-full z-20">
                                <div className="bg-primary text-dark w-8 h-8 flex items-center justify-center rounded-full text-sm">
                                    <FontAwesomeIcon icon={faHeart} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <h1 className="text-6xl md:text-7xl font-serif text-white mb-3 tracking-tight lowercase">
                        {data.name}
                    </h1>

                    {/* Dates */}
                    <div className="flex items-center justify-center gap-3 text-primary font-bold text-xs tracking-[0.2em] uppercase mb-16">
                        <span>{data.birthDate ? new Date(data.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Unknown"}</span>
                        <span className="text-[8px] opacity-50">●</span>
                        <span>{data.passingDate ? new Date(data.passingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Unknown"}</span>
                    </div>

                    {/* Quote */}
                    <div className="relative max-w-xl mx-auto">
                        <FontAwesomeIcon icon={faQuoteLeft} className="text-white/10 text-5xl absolute -top-8 -left-4" />
                        <p className="text-white/60 font-serif italic text-lg leading-relaxed">
                            "{t('memorial_page.in_loving_memory')}"
                        </p>
                    </div>

                    {/* Animated Scroll Indicator */}
                    <button
                        onClick={() => document.getElementById('life-story')?.scrollIntoView({ behavior: 'smooth' })}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 group transition-all duration-300 z-20"
                        aria-label="Scroll down"
                    >
                        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1 group-hover:border-primary transition-colors">
                            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-scroll group-hover:bg-primary"></div>
                        </div>
                    </button>
                </div>
            </header>

            {/* Life Story Section - Light/Cream Theme */}
            <section id="life-story" className="py-32 bg-[#FAF9F6] relative">
                {/* Decorative Icon Top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#FAF9F6] rounded-full flex items-center justify-center border border-primary/20 text-primary text-xl shadow-sm">
                    <FontAwesomeIcon icon={faBookOpen} />
                </div>

                <div className="container mx-auto px-6 max-w-4xl text-center">
                    <h2 className="text-4xl md:text-5xl font-serif text-dark mb-16">
                        {t('memorial_page.life_story_title')}
                    </h2>

                    <div className="space-y-8 text-gray-600 leading-loose font-serif text-lg md:text-xl font-light">
                        <TranslatedText text={data.bio} isHtml={true} className="bio-content" />
                        <p>
                            {t('memorial_page.bio_p1', { firstName })}
                        </p>
                        <p>
                            {t('memorial_page.bio_p2', { firstName })}
                        </p>

                        <div className="py-8 flex justify-center">
                            <div className="w-24 h-[1px] bg-primary/40 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-primary"></div>
                            </div>
                        </div>

                        <p>
                            {t('memorial_page.bio_p3', { firstName })}
                        </p>

                        <div className="pt-12">
                            <div className="inline-block px-12 py-6 bg-[#F4F1EA] rounded-sm border border-[#EAE5D5]">
                                <p className="font-serif italic text-dark/70">
                                    {t('memorial_page.bio_quote')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Photo Gallery - Polaroid Style */}
            <section className="py-32 bg-[#EFEDE6] border-t border-[#E5E0D0] relative overflow-hidden">
                {/* Header */}
                <div className="text-center mb-20 relative z-10">
                    <div className="w-16 h-16 bg-[#FDFCF8] rounded-full mx-auto flex items-center justify-center border border-primary/20 text-primary text-xl mb-6 shadow-sm">
                        <FontAwesomeIcon icon={faImage} />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('memorial_page.memories_title')}</h2>
                    <p className="text-gray-500 font-sans text-sm tracking-wide uppercase">{t('memorial_page.memories_subtitle')}</p>
                </div>

                {/* Grid */}
                <div className="container mx-auto px-6 max-w-6xl">
                    {/* Show gallery if images exist. If demo, show placeholders. If real tribute and empty, show message. */}
                    {
                        (isDemo || (data.images && data.images.length > 0)) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                                {(data.images && data.images.length > 0 ? data.images : (isDemo ? [
                                    "https://images.unsplash.com/photo-1544299863-71a5c60205b3?q=80&w=2670&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1582239088698-c91726a97864?q=80&w=2670&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=2674&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=2832&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1500353457223-288279bb2893?q=80&w=2670&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1516315609425-46aa1d5a7d7d?q=80&w=2667&auto=format&fit=crop",
                                ] : [])).map((item, index) => {
                                    const src = typeof item === 'object' ? item.url : item;
                                    return (
                                        <div key={index} className="bg-white p-3 pb-8 rounded shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group relative">
                                            {/* Gold corners */}
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/30 m-1"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/30 m-1"></div>
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/30 m-1"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/30 m-1"></div>

                                            <div className="aspect-square bg-gray-100 overflow-hidden mb-4 grayscale group-hover:grayscale-0 transition-all duration-700">
                                                <img src={src} alt={t('memorial_page.memory_item', { count: index + 1 })} className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-center font-sans text-xs text-gray-500 uppercase tracking-widest text-dark">
                                                {isDemo ? [
                                                    t('memorial_page.demo_photo_0'),
                                                    t('memorial_page.demo_photo_1'),
                                                    t('memorial_page.demo_photo_2'),
                                                    t('memorial_page.demo_photo_3'),
                                                    t('memorial_page.demo_photo_4'),
                                                    t('memorial_page.demo_photo_5')
                                                ][index] : t('memorial_page.memory_item', { count: index + 1 })}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400 italic">
                                {t('memorial_page.no_photos')}
                            </div>
                        )
                    }
                </div>

                <div className="mt-20 flex justify-center">
                    <div className="bg-white px-8 py-4 rounded shadow-sm border border-gray-100 flex items-center gap-3">
                        <span className="text-primary text-lg">♦</span>
                        <span className="text-gray-500 text-sm uppercase tracking-widest">{t('memorial_page.photo_quote')}</span>
                        <span className="text-primary text-lg">♦</span>
                    </div>
                </div>
            </section>

            {/* Video Section - "Bewegende Erinnerungen" */}
            <section className="py-32 bg-[#F9F8F4] border-t border-[#E5E0D0] relative">
                <div className="text-center mb-20">
                    <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center border border-primary/20 text-primary text-xl mb-6 shadow-sm">
                        <FontAwesomeIcon icon={faPlay} className="ml-1" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('memorial_page.videos_title')}</h2>
                    <p className="text-gray-500 font-sans text-sm tracking-wide uppercase">{t('memorial_page.videos_subtitle')}</p>
                </div>

                <div className="container mx-auto px-6 max-w-6xl">
                    {(isDemo || (data.videos && data.videos.length > 0) || (data.videoUrls && data.videoUrls.length > 0)) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* YouTube / Embed Videos */}
                            {data.videoUrls && data.videoUrls.map((url, index) => {
                                let embedUrl = url;
                                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                    const match = url.match(regExp);
                                    if (match && match[2].length === 11) {
                                        embedUrl = `https://www.youtube.com/embed/${match[2]}`;
                                    }
                                } else if (url.includes('vimeo.com')) {
                                    const match = url.match(/vimeo.com\/(\d+)/);
                                    if (match) {
                                        embedUrl = `https://player.vimeo.com/video/${match[1]}`;
                                    }
                                }

                                return (
                                    <div key={`embed-${index}`} className="bg-white p-3 pb-6 rounded shadow-sm group relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/30 m-1"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/30 m-1"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/30 m-1"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/30 m-1"></div>

                                        <div className="relative aspect-video bg-black overflow-hidden group-hover:shadow-lg transition-all duration-500">
                                            <iframe
                                                src={embedUrl}
                                                className="w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={`Video ${index}`}
                                            ></iframe>
                                        </div>
                                        <div className="mt-4 px-2 flex justify-between items-center text-xs">
                                            <span className="font-serif text-dark font-medium text-lg capitalize">
                                                {url.includes('youtube') ? 'YouTube Video' : url.includes('vimeo') ? 'Vimeo Video' : 'Memorial Video'}
                                            </span>
                                            <span className="text-primary">♦</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Uploaded Videos */}
                            {(data.videos && data.videos.length > 0 ? data.videos : (isDemo && (!data.videoUrls || data.videoUrls.length === 0) ? [
                                "https://assets.mixkit.co/videos/preview/mixkit-family-walking-together-in-nature-39767-large.mp4",
                                "https://assets.mixkit.co/videos/preview/mixkit-mother-with-her-little-daughter-eating-a-marshmallow-in-nature-39764-large.mp4",
                                "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4"
                            ] : [])).map((item, index) => {
                                const src = typeof item === 'object' ? item.url : item;
                                return (
                                    <div key={index} className="bg-white p-3 pb-6 rounded shadow-sm group relative">
                                        {/* Gold corners */}
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/30 m-1"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/30 m-1"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/30 m-1"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/30 m-1"></div>

                                        <div className="relative aspect-video bg-black overflow-hidden group-hover:shadow-lg transition-all duration-500 cursor-pointer">
                                            <video src={src} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" controls />
                                        </div>
                                        <div className="mt-4 px-2 flex justify-between items-center text-xs">
                                            <span className="font-serif text-dark font-medium text-lg">
                                                {isDemo ? [
                                                    t('memorial_page.demo_video_0'),
                                                    t('memorial_page.demo_video_1'),
                                                    t('memorial_page.demo_video_2')
                                                ][index] : t('memorial_page.video_item', { count: index + 1 })}
                                            </span>
                                            <span className="text-primary">♦</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400 italic">
                            {t('memorial_page.no_videos')}
                        </div>
                    )}
                </div>
            </section>

            {/* Tributes Section - "Worte aus dem Herzen" */}
            <section className="py-32 bg-[#EFEDE6] border-t border-[#E5E0D0]">
                <div className="text-center mb-20">
                    <div className="w-16 h-16 bg-[#FDFCF8] rounded-full mx-auto flex items-center justify-center border border-primary/20 text-primary text-xl mb-6 shadow-sm">
                        <FontAwesomeIcon icon={faQuoteLeft} />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('memorial_page.tributes_title')}</h2>
                    <p className="text-gray-500 font-sans text-sm tracking-wide uppercase">{t('memorial_page.tributes_subtitle')}</p>
                </div>

                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Display Comments */}
                        {displayComments.map((tribute, index) => (
                            <div key={index} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:border-primary/30 transition-colors relative">
                                <div className="absolute top-0 left-0 w-3 h-full border-l-2 border-primary/10"></div>

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-10 h-10 border border-primary/30 rounded flex items-center justify-center text-primary/60 text-lg">
                                        <FontAwesomeIcon icon={faPen} className="text-sm" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-dark font-serif">{tribute.name}</h4>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest">{tribute.date}</p>
                                    </div>
                                </div>

                                <div className="relative pl-2">
                                    <FontAwesomeIcon icon={faQuoteLeft} className="absolute -top-1 -left-4 text-primary/10 text-xl" />
                                    <p className="text-gray-600 font-serif leading-relaxed text-sm">
                                        <TranslatedText text={tribute.text}></TranslatedText>
                                    </p>
                                    <div className="flex gap-1 justify-end mt-4 text-primary/40 text-[10px]">
                                        <span>♦</span><span>♦</span><span>♦</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA Box */}
                    <div className="mt-20 max-w-2xl mx-auto bg-[#FDFCF8] p-10 text-center border border-primary/20 rounded shadow-sm">
                        <h4 className="font-serif text-dark text-xl mb-6">{t('memorial_page.leave_message_title')}</h4>
                        <button
                            onClick={() => setIsCondolenceModalOpen(true)}
                            className="bg-[#D4AF37] text-white px-8 py-3 rounded hover:bg-[#C4A027] transition-colors flex items-center justify-center gap-2 mx-auto shadow-lg shadow-primary/20"
                        >
                            <FontAwesomeIcon icon={faPen} className="text-sm" /> {t('memorial_page.leave_message_button')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Share Section - "Teilen Sie dieses Denkmal" */}
            <section className="py-32 bg-[#FAF9F6] border-t border-[#E5E0D0] relative overflow-hidden">
                {/* Background decorative faint lines if needed */}

                <div className="container mx-auto px-6 max-w-4xl relative z-10">
                    <div className="text-center mb-16">
                        <div className="w-16 h-16 bg-[#FDFCF8] rounded-full mx-auto flex items-center justify-center border border-primary/20 text-primary text-xl mb-6 shadow-sm ring-4 ring-[#FAF9F6]">
                            <FontAwesomeIcon icon={faShareNodes} />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-serif text-dark mb-4">{t('memorial_page.share_title')}</h2>
                        <p className="text-gray-500 font-sans text-sm tracking-wide uppercase">{t('memorial_page.share_subtitle')}</p>
                    </div>

                    <div className="bg-white p-8 md:p-12 rounded shadow-lg border border-gray-100 flex flex-col md:flex-row gap-12 items-center relative">
                        {/* Gold Corners for main box */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary/20 m-2"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-primary/20 m-2"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-primary/20 m-2"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-primary/20 m-2"></div>

                        {/* Left: QR Code */}
                        <div className="flex-shrink-0 text-center">
                            <div className="w-48 h-48 bg-white p-2 border-2 border-primary/10 relative mx-auto mb-4 flex items-center justify-center">
                                {/* Corner marks for QR */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40 -m-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/40 -m-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/40 -m-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40 -m-1"></div>

                                <QRCodeCanvas
                                    value={`${window.location.origin}/memorial/${data.slug || data.id || id || 'demo'}`}
                                    size={160}
                                    fgColor="#333333"
                                />
                            </div>
                            <p className="text-xs text-gray-400">{t('memorial_page.scan_qr')}</p>
                        </div>

                        {/* Right: Link & Status */}
                        <div className="flex-grow w-full space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Memorial Link</label>
                                <div className="flex gap-3">
                                    <div className="flex-grow bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded text-sm font-mono truncate select-all">
                                        {`${window.location.origin}/memorial/${data.slug || data.id || id || 'eleanor-rose-mitchell'}`}
                                    </div>
                                    <button
                                        onClick={copyToClipboard}
                                        className="bg-[#D4AF37] text-white px-6 py-2 rounded hover:bg-[#C4A027] transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap shadow-md shadow-primary/20"
                                    >
                                        <FontAwesomeIcon icon={faCopy} /> {t('memorial_page.copy_button')}
                                    </button>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded p-4 flex items-center gap-4 bg-gray-50/50">
                                <div className="w-10 h-10 border border-primary/30 rounded flex items-center justify-center text-primary/60 bg-white flex-shrink-0">
                                    <FontAwesomeIcon icon={faGlobe} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-dark text-sm">{t('memorial_page.public_memorial')}</h4>
                                    <p className="text-xs text-gray-400">{t('memorial_page.public_desc')}</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 text-left">{t('memorial_page.share_footer')}</p>
                        </div>
                    </div>
                </div>

            </section>

            {/* Closing / In Memory Section */}
            <section className="py-32 bg-[#FAF9F6] text-center overflow-hidden">
                <div className="container mx-auto px-6 max-w-3xl relative">
                    {/* Top Icon */}
                    <div className="mb-12 relative inline-block">
                        <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center mx-auto text-primary text-2xl bg-white shadow-sm">
                            <span className="font-serif">✧</span>
                        </div>
                        {/* Sparkles around if needed */}
                        <span className="absolute -top-2 -right-2 text-primary/40 text-sm">✦</span>
                    </div>

                    <h3 className="text-3xl md:text-4xl font-serif text-dark leading-snug mb-8">
                        {t('memorial_page.closing_quote')}
                    </h3>

                    <div className="flex justify-center gap-2 text-primary/40 text-xs mb-8">
                        <span>♦</span><span>♦</span><span>♦</span>
                    </div>

                    <p className="text-gray-500 font-serif leading-loose text-lg mb-20 max-w-2xl mx-auto">
                        {t('memorial_page.closing_tribute', { firstName })}
                    </p>

                    {/* Final Memorial Box */}
                    <div className="relative inline-block py-12">
                        {/* Vertical Line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-12 w-[1px] bg-primary/20"></div>

                        <div className="border border-primary/30 px-12 py-6 bg-white shadow-sm relative">
                            {/* Gold Corners */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/60 -m-[1px]"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/60 -m-[1px]"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/60 -m-[1px]"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/60 -m-[1px]"></div>

                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium">{t('memorial_page.in_loving_memory')}</p>

                            {/* Decorative logic center */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <div className="h-[1px] w-8 bg-primary/30"></div>
                                <div className="w-2 h-2 bg-primary rotate-45"></div>
                                <div className="h-[1px] w-8 bg-primary/30"></div>
                            </div>
                        </div>

                        {/* Bottom Diamonds */}
                        <div className="flex justify-center gap-2 text-primary/20 text-[10px] mt-8">
                            <span>♦</span><span>♦</span><span>♦</span>
                        </div>
                    </div>
                </div>

                {/* Footer Area */}
                <div className="mt-20 pt-12 border-t border-primary/5">
                    <p className="text-gray-400 text-sm mb-2">{t('memorial_page.created_by')} <span className="text-[#D4AF37] font-medium">Tributto</span></p>
                    <p className="text-gray-300 text-xs">{t('memorial_page.tagline')}</p>

                    <div className="mt-8">
                        <div className="w-10 h-10 border border-primary/20 mx-auto flex items-center justify-center text-primary/40 text-xs bg-white shadow-sm">
                            <span>♦</span>
                        </div>
                    </div>
                </div>
            </section>


            {/* Condolence Book Modal */}
            {
                isCondolenceModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md relative animate-slideUp">
                            {/* Close Button */}
                            <button
                                onClick={() => setIsCondolenceModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-dark transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xl" />
                            </button>

                            <div className="p-8">
                                {/* Icon Header */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full border border-[#D4AF37] flex items-center justify-center mx-auto mb-4">
                                        <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center text-white text-xl">
                                            <FontAwesomeIcon icon={faBookOpen} />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-dark uppercase tracking-wide">{t('memorial_page.condolence_book')}</h3>
                                </div>

                                <form onSubmit={handleCondolenceSubmit} className="space-y-6">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder={t('memorial_page.your_name')}
                                            value={condolenceForm.name}
                                            onChange={(e) => setCondolenceForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#D4AF37] transition-colors text-gray-700 placeholder-gray-400 font-light"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <textarea
                                            placeholder={t('memorial_page.your_message')}
                                            value={condolenceForm.comment}
                                            onChange={(e) => setCondolenceForm(prev => ({ ...prev, comment: e.target.value }))}
                                            rows="5"
                                            className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#D4AF37] transition-colors text-gray-700 placeholder-gray-400 font-light resize-none"
                                            required
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-[#D4AF37] text-white font-bold py-3 rounded uppercase tracking-wide hover:bg-[#C4A027] transition-colors shadow-md"
                                    >
                                        {t('memorial_page.add_button')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default MemorialPage;
