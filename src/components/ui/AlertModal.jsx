
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheckCircle, faExclamationCircle, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const AlertModal = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = 'Got it',
    cancelText = 'Cancel',
    onCancel
}) => {
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        let timer;
        if (isOpen) {
            setIsRendered(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            timer = setTimeout(() => setIsRendered(false), 300);
        }

        return () => {
            if (timer) clearTimeout(timer);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isRendered && !isOpen) return null;

    const icons = {
        success: {
            icon: faCheckCircle,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            accent: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-500/20'
        },
        error: {
            icon: faExclamationTriangle,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            accent: 'from-rose-500 to-pink-600',
            shadow: 'shadow-rose-500/20'
        },
        info: {
            icon: faInfoCircle,
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
            accent: 'from-sky-500 to-indigo-600',
            shadow: 'shadow-sky-500/20'
        },
        warning: {
            icon: faExclamationCircle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            accent: 'from-amber-500 to-orange-600',
            shadow: 'shadow-amber-500/20'
        }
    };

    const config = icons[type] || icons.info;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop with strong blur */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-xl transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onCancel || onClose}
            ></div>

            {/* Modal Container */}
            <div className={`relative bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md rounded-[2.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] w-full max-w-sm overflow-hidden border border-white/40 dark:border-white/10 transition-all duration-500 transform ${isOpen ? 'scale-100 translate-y-0 active:scale-[0.99]' : 'scale-90 translate-y-8'}`}>

                {/* Close Button Header */}
                <div className="flex justify-end p-6 pb-0">
                    <button
                        onClick={onCancel || onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all transform hover:rotate-90"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="px-10 pb-10 pt-4 text-center">
                    {/* Animated Icon Circle */}
                    <div className={`mx-auto w-24 h-24 ${config.bg} ${config.border} border rounded-[2rem] flex items-center justify-center ${config.color} text-4xl mb-8 relative group`}>
                        <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${config.accent} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                        <FontAwesomeIcon
                            icon={config.icon}
                            className={`transform transition-transform duration-500 ${isOpen ? 'scale-110' : 'scale-50'}`}
                        />
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight leading-tight">
                        {title || type.charAt(0).toUpperCase() + type.slice(1)}
                    </h3>

                    <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-10 font-medium px-2">
                        {message}
                    </p>

                    <div className="flex flex-col gap-3">
                        {/* Primary Button with Gradient */}
                        <button
                            onClick={onClose}
                            className={`w-full bg-gradient-to-r ${config.accent} text-white font-black py-4.5 rounded-2xl transition-all shadow-lg ${config.shadow} hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 text-lg`}
                        >
                            {confirmText}
                        </button>

                        {/* Optional Cancel Button */}
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold py-4 rounded-2xl transition-all text-base mt-1"
                            >
                                {cancelText}
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Accent Line */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${config.accent}`}></div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}} />
        </div>
    );
};

export default AlertModal;
