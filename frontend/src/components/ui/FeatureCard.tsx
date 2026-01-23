import React from 'react';
import { ChevronRight } from 'lucide-react';

interface FeatureCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
    icon: Icon,
    title,
    description,
    isHovered,
    onMouseEnter,
    onMouseLeave
}) => {
    return (
        <div
            className="group relative h-full"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className={`relative p-8 rounded-2xl border bg-gradient-to-br transition duration-300 overflow-hidden h-full ${isHovered
                ? 'border-purple-500/50 from-purple-900/20 to-pink-900/20 shadow-lg'
                : 'border-purple-500/20 from-purple-900/10 to-pink-900/10'
                }`}>
                {/* Animated corner glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-3xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-purple-400" />
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>

                    <div className={`mt-6 flex items-center gap-2 text-purple-400 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-sm font-semibold">Learn more</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeatureCard;
