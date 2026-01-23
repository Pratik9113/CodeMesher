import React, { useState } from 'react';
import { Zap, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import BackgroundEffects from './components/layout/BackgroundEffects';
import Navbar from './components/layout/Navbar';
import FeatureCard from './components/ui/FeatureCard';
import { HOME_FEATURES } from './utils/homeConfig';

export default function HomeSection() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden selection:bg-purple-500/30">
      <BackgroundEffects />
      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 min-h-[90vh] flex items-center justify-center px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full hover:border-purple-500/60 transition-all duration-300">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Empowering Your Development</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight tracking-tight">
            <span className="text-white">RepoVision AI is</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
              Empowering Your Code
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            We're building the most powerful GitHub repository visualization and analysis tool ever created. Understand your codebase like never before.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col items-center gap-10">
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/playground"
                className="px-10 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-3 group no-underline"
              >
                Launch Playground
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-10 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-md">
                View Documentation
              </button>
            </div>

            {/* Hero Image Mockup */}
            <div className="relative w-full max-w-5xl mt-8 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/50">
                <img
                  src="/repovision_landing_hero_1769144857480.png"
                  alt="RepoVision Dashboard Preview"
                  className="w-full h-auto opacity-90 group-hover:scale-[1.01] transition-transform duration-700"
                  onError={(e) => {
                    // Fallback to a placeholder if image not found in public
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 whitespace-pre-wrap">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Core Capabilities</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">Powerful Features</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Now Available
              </span>
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {HOME_FEATURES.map((feature, index) => (
              <FeatureCard
                key={index}
                {...feature}
                isHovered={hoveredFeature === index}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-32 px-8">
        <div className="max-w-4xl mx-auto text-center py-20 px-10 rounded-3xl bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 backdrop-blur-sm">
          <h3 className="text-4xl md:text-5xl font-bold mb-8 text-white">
            Ready to visualize your code?
          </h3>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed max-w-2xl mx-auto">
            Get started with RepoVision AI and transform the way you understand and optimize your codebase.
          </p>
          <button className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-purple-500/50 transition duration-300 flex items-center gap-3 group mx-auto text-lg">
            Get Started Now
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
      </section>
    </div>
  );
}