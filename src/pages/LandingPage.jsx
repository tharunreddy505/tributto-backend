import React, { useState, useEffect } from 'react';
import { useTributeContext } from '../context/TributeContext';
import Hero from '../components/sections/Hero';
import Tributes from '../components/sections/Tributes';
import WhyChoose from '../components/sections/WhyChoose';
import MemorialCreation from '../components/sections/MemorialCreation';
import Features from '../components/sections/Features';
import FAQ from '../components/sections/FAQ';
import CreateMemorialModal from '../components/create/CreateMemorialModal';
import VisualBuilder from '../components/admin/VisualBuilder';
import { RenderContentWithShortcodes } from '../components/ContentPart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import heroImage from '../assets/images/hero-image.png';
import howItWorksImage from '../assets/images/HowItWorks.png';

const LandingPage = () => {
    const { pages, addPage, updatePage } = useTributeContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Admin Check
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.username === 'admin' || user.email?.includes('admin');

    // Find dynamic home page
    const homePage = pages.find(p => p.slug === 'home' && p.status === 'published');

    const handleSave = async (html) => {
        if (homePage) {
            await updatePage(homePage.id, { content: html });
        } else {
            await addPage({ title: 'Home', slug: 'home', content: html, status: 'published' });
        }
        setIsEditMode(false);
        // Optional: reload to ensure fresh state if needed, though context update should handle it
        window.location.reload();
    };

    // Effect to handle clicks from injected HTML (like 'Create a Tribute' buttons)
    useEffect(() => {
        const handleCreateClick = (e) => {
            // Traverse up to find if a click came from a trigger
            const trigger = e.target.closest('.js-create-memorial');
            if (trigger) {
                e.preventDefault();
                setIsModalOpen(true);
            }
        };

        document.addEventListener('click', handleCreateClick);
        return () => document.removeEventListener('click', handleCreateClick);
    }, []);

    // Default HTML Template for new custom homepages
    // replicating the original design using Tailwind CSS and HTML
    const defaultHomeHtml = `
    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center text-white overflow-hidden" style="min-height: 600px; background-color: #111;">
        <!-- Background Image -->
        <div class="absolute inset-0 z-0">
            <img 
                src="${heroImage}" 
                alt="Celebrate a Life" 
                class="w-full h-full object-cover opacity-60"
            />
            <div class="absolute inset-0 bg-black/40"></div>
        </div>

        <div class="container mx-auto px-6 relative z-10 text-center">
            <h1 class="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 leading-tight">
                CELEBRATE A LIFE <br />
                <span class="text-[#D4AF37] italic">BEAUTIFULLY LIVED</span>
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
                Create a lasting, beautiful page where friends and family can share memories, photos, and stories—preserving their legacy for years to come.
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button class="js-create-memorial bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all flex items-center gap-2">
                    Create a Tribute
                </button>
                <button class="flex items-center gap-2 text-white border border-white/30 px-8 py-3 rounded-full hover:bg-white/10 transition-all">
                    <div class="w-8 h-8 rounded-full bg-white text-dark flex items-center justify-center text-xs text-black">
                        <i class="fas fa-play ml-0.5"></i>
                    </div>
                    <span>Watch How It Works</span>
                </button>
            </div>
        </div>
        
        <!-- Scroll Indicator -->
        <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-20">
             <span class="text-[10px] uppercase tracking-widest text-white/40 font-bold">Scroll</span>
             <div class="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
                <div class="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"></div>
             </div>
        </div>
    </section>

    <!-- Tributes Grid Section -->
    <section class="py-20 bg-light">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-serif font-bold text-dark mb-4 text-gray-900">
                    Beautiful tributes to <br />
                    <span class="text-[#D4AF37] italic">remarkable lives</span>
                </h2>
                <p class="text-gray-600 max-w-2xl mx-auto">
                    See how families everywhere are preserving memories and celebrating their loved ones.
                </p>
            </div>

            <!-- Dynamic Grid Placeholder -->
            <div class="max-w-7xl mx-auto">
                [memorial_grid]
            </div>
        </div>
    </section>

    <!-- Why Choose Section -->
    <section class="py-20 bg-[#1a1a1a] text-white">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-serif font-bold mb-4">
                    Why choose <br />
                    <span class="text-[#D4AF37] italic">Tributtoo</span>
                </h2>
                <p class="text-white/60 max-w-2xl mx-auto">
                    We've thoughtfully designed every detail to help you honor your loved one with grace and beauty.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-heart text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Forever Remembered</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Create a timeless space where memories live on, accessible anytime, anywhere, for generations to come.
                    </p>
                </div>
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-users text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Bring People Together</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Invite family and friends to share stories, photos, and memories in one beautiful place.
                    </p>
                </div>
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-clock text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Easy to Create</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Set up a meaningful memorial in minutes with our intuitive, compassionate design.
                    </p>
                </div>
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-shield-alt text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Private & Secure</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Control who can view and contribute. Your memories are protected with care and respect.
                    </p>
                </div>
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-star text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Beautifully Designed</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Premium, elegant templates that honor your loved one with the dignity they deserve.
                    </p>
                </div>
                <div class="bg-white p-8 rounded-2xl text-left">
                    <div class="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-globe text-[#D4AF37] text-xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 font-serif">Share Anywhere</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Easily share your memorial page with a simple link. No account required to view.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Memorial Creation Section -->
    <section class="py-24 bg-white">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-serif font-bold text-dark mb-4 text-gray-900">
                    Creating a memorial is <br />
                    <span class="text-[#D4AF37] italic">simple and meaningful</span>
                </h2>
                <p class="text-gray-600">
                    Just a few steps to create a beautiful place for memories to live.
                </p>
            </div>

            <div class="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer">
                <img
                    src="${howItWorksImage}"
                    alt="How it works"
                    class="w-full h-auto object-cover"
                />
                <div class="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                    <i class="fas fa-play-circle text-7xl text-white drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300 opacity-90"></i>
                </div>
            </div>

            <div class="text-center mt-12 text-gray-500 text-sm">
                Trust, caring, and love are woven into every pixel of what we build.
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-[#1a1a1a] text-white">
        <div class="container mx-auto px-6">
            <div class="text-center mb-20">
                <h2 class="text-4xl font-serif font-bold mb-4">
                    Everything you need to <br />
                    <span class="text-[#D4AF37] italic">honor their legacy</span>
                </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-infinity text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Unlimited Storage</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Add as many photos, videos, and stories as you like. No limits on memories.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-lock text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Complete Privacy Control</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Choose who can view and contribute. Public, private, or invite-only options.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-share-nodes text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Easy Sharing</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Share with one simple link. Friends and family can visit without creating an account.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-images text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Beautiful Photo Galleries</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Showcase cherished moments in elegant, responsive photo galleries.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-comment-dots text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Condolence Messages</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Let loved ones leave heartfelt messages and share their own memories.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-calendar-alt text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Important Dates</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Remember birthdays, anniversaries, and special milestones together.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-check-circle text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">No Ads, Ever</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">A respectful, ad-free experience that honors your loved one with dignity.</p>
                </div>
                <div class="bg-white text-gray-900 p-8 rounded-2xl hover:translate-y-[-4px] transition-transform duration-300">
                    <div class="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-6">
                        <i class="fas fa-award text-[#D4AF37]"></i>
                    </div>
                    <h3 class="text-lg font-bold mb-3 font-serif">Premium Quality</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">Professional design that reflects the care and love you want to express.</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-8 mt-24 text-center border-t border-white/10 pt-12 max-w-4xl mx-auto">
                <div>
                    <div class="text-3xl font-bold text-[#D4AF37] mb-1 font-serif">50,000+</div>
                    <div class="text-xs text-white/40 uppercase tracking-widest font-sans">Memorial Pages Created</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-[#D4AF37] mb-1 font-serif">99.9%</div>
                    <div class="text-xs text-white/40 uppercase tracking-widest font-sans">Uptime Guarantee</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-[#D4AF37] mb-1 font-serif">24/7</div>
                    <div class="text-xs text-white/40 uppercase tracking-widest font-sans">Support Available</div>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-24 bg-white">
        <div class="container mx-auto px-6 max-w-3xl">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-serif font-bold text-dark mb-4 text-gray-900">
                    Questions you <br />
                    <span class="text-[#D4AF37] italic">may have</span>
                </h2>
                <p class="text-gray-500 text-sm">
                    Everything you need to know about creating a tribute.
                </p>
            </div>

            <div class="space-y-4">
                <!-- FAQ Item 1 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">How long will the memorial page last?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                        Your memorial page is preserved indefinitely. We are committed to keeping your memories safe for generations to come.
                    </div>
                </details>
                <!-- FAQ Item 2 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">Can I control who sees the memorial page?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                        Yes, you have complete control. You can make the page public, private (password protected), or visible only to invited guests.
                    </div>
                </details>
                <!-- FAQ Item 3 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">How do I invite family and friends to contribute?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                        You can share a simple link via email, text, or social media. Guests can contribute photos and stories without needing to create an account.
                    </div>
                </details>
                 <!-- FAQ Item 4 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">Is there a limit to photos and videos I can upload?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                        No, we offer unlimited storage for photos, videos, and stories. You can preserve as many memories as you wish.
                    </div>
                </details>
                 <!-- FAQ Item 5 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">Can I edit the memorial page after creating it?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                        Absolutely. You can edit text, add or remove photos, and change settings at any time as the page administrator.
                    </div>
                </details>
                <!-- FAQ Item 6 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">What happens if I need help or support?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                         Our support team is available 24/7. You can reach out to us anytime, and we will help you with any questions or technical issues.
                    </div>
                </details>
                 <!-- FAQ Item 7 -->
                <details class="group border rounded-2xl border-gray-100 shadow-sm open:border-[#D4AF37] open:shadow-md transition-all duration-300">
                    <summary class="flex justify-between items-center px-8 py-6 cursor-pointer list-none hover:bg-gray-50/50">
                        <span class="text-lg font-medium text-gray-900 group-open:text-[#D4AF37]">How much does Tributtoo cost?</span>
                        <span class="ml-4 transition-transform duration-300 group-open:rotate-180 text-gray-400 group-open:text-[#D4AF37]"><i class="fas fa-chevron-down text-sm"></i></span>
                    </summary>
                    <div class="px-8 pb-8 pt-0 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2">
                         We offer a free plan to get started. Our premium features, including unlimited storage and advanced privacy, are available for a one-time payment.
                    </div>
                </details>
            </div>
        </div>
    </section>
    `;

    if (isEditMode) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white">
                <VisualBuilder
                    initialHtml={homePage?.content || defaultHomeHtml}
                    onSave={handleSave}
                    onClose={() => setIsEditMode(false)}
                />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Admin Edit Button */}
            {isAdmin && (
                <button
                    onClick={() => setIsEditMode(true)}
                    className="fixed bottom-6 right-6 z-50 bg-[#D4AF37] text-white w-14 h-14 rounded-full shadow-lg hover:bg-[#C4A027] transition-all flex items-center justify-center text-xl hover:scale-110"
                    title={homePage ? "Edit Homepage" : "Customize Homepage"}
                >
                    <FontAwesomeIcon icon={faPen} />
                </button>
            )}

            {homePage ? (
                <RenderContentWithShortcodes content={homePage.content} />
            ) : (
                <>
                    <Hero onOpenModal={() => setIsModalOpen(true)} />
                    <Tributes />
                    <WhyChoose />
                    <MemorialCreation onOpenModal={() => setIsModalOpen(true)} />
                    <Features />
                    <FAQ />

                    <CreateMemorialModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                    />
                </>
            )}

            {/* Modal for when triggered from custom HTML */}
            <CreateMemorialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default LandingPage;
