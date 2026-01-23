import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PlaygroundCardProps {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    features: string[];
    to: string;
    colorScheme: 'purple' | 'blue' | 'green';
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const PlaygroundCard: React.FC<PlaygroundCardProps> = ({
    icon: Icon,
    title,
    description,
    features,
    to,
    colorScheme,
    isHovered,
    onMouseEnter,
    onMouseLeave
}) => {
    const schemas = {
        purple: {
            glow: 'from-purple-600/20 to-pink-600/20',
            border: 'hover:border-purple-500/50',
            innerGlow: 'from-purple-500/10 via-transparent to-pink-500/10',
            iconBg: 'from-purple-600/30 to-pink-600/30',
            iconBorder: 'border-purple-500/50',
            iconColor: 'text-purple-400',
            dot: 'bg-purple-400',
            corner: 'from-purple-500/20'
        },
        blue: {
            glow: 'from-blue-600/20 to-cyan-600/20',
            border: 'hover:border-blue-500/50',
            innerGlow: 'from-blue-500/10 via-transparent to-cyan-500/10',
            iconBg: 'from-blue-600/30 to-cyan-600/30',
            iconBorder: 'border-blue-500/50',
            iconColor: 'text-blue-400',
            dot: 'bg-blue-400',
            corner: 'from-blue-500/20'
        },
        green: {
            glow: 'from-green-600/20 to-emerald-600/20',
            border: 'hover:border-green-500/50',
            innerGlow: 'from-green-500/10 via-transparent to-emerald-500/10',
            iconBg: 'from-green-600/30 to-emerald-600/30',
            iconBorder: 'border-green-500/50',
            iconColor: 'text-green-400',
            dot: 'bg-green-400',
            corner: 'from-green-500/20'
        }
    };

    const s = schemas[colorScheme];

    return (
        <div
            className="group relative"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} rounded-2xl blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className={`relative h-full px-8 py-12 rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-black/80 ${s.border} transition-all duration-500 backdrop-blur-sm overflow-hidden`}>
                {/* Card glow effect */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.innerGlow}`}></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${s.iconBg} border ${s.iconBorder} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-8 h-8 ${s.iconColor}`} />
                    </div>

                    <h2 className="text-3xl font-bold mb-4 text-white">{title}</h2>

                    <p className="text-gray-400 text-base leading-relaxed mb-6">
                        {description}
                    </p>

                    <div className="space-y-3 mb-8">
                        {features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full ${s.dot} mt-2 flex-shrink-0`}></div>
                                <span className="text-sm text-gray-300">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <Link
                        to={to}
                        className="w-full group/btn relative px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50 flex justify-center"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Explore {title}
                            <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </span>
                    </Link>
                </div>

                {/* Animated corner */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.corner} to-transparent rounded-bl-3xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
        </div>
    );
};

export default PlaygroundCard;
