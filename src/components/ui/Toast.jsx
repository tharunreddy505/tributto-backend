import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

const Toast = ({ message, type = 'success', onClose, duration = 5000 }) => {
    const [progress, setProgress] = useState(100);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining === 0) {
                handleClose();
            }
        }, 10);

        return () => clearInterval(interval);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for fade-out animation
    };

    const icons = {
        success: faCheckCircle,
        error: faExclamationCircle,
        info: faExclamationCircle
    };

    const colors = {
        success: 'from-emerald-500 to-teal-600',
        error: 'from-red-500 to-rose-600',
        info: 'from-blue-500 to-indigo-600'
    };

    return (
        <div className={`fixed top-6 right-6 z-[9999] transform transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-12 scale-95' : 'opacity-100 translate-x-0 scale-100'}`}>
            <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-5 min-w-[320px] max-w-[400px] flex items-center gap-4 group">
                {/* Visual Accent */}
                <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colors[type]} flex items-center justify-center text-white shadow-lg shadow-current/20`}>
                    <FontAwesomeIcon icon={icons[type]} className="text-xl" />
                </div>

                <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 capitalize leading-none mb-1">{type}</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{message}</p>
                </div>

                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
                >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-[3px] bg-gray-100 w-full">
                    <div
                        className={`h-full bg-gradient-to-r ${colors[type]} transition-all duration-100 linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Toast;
