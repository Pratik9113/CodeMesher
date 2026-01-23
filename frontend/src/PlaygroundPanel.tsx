import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import BackgroundEffects from './components/layout/BackgroundEffects';
import Navbar from './components/layout/Navbar';
import PlaygroundCard from './components/ui/PlaygroundCard';
import { PLAYGROUND_ITEMS } from './utils/playgroundConfig';

export default function PlaygroundPanel() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      <BackgroundEffects showParticles={false} />
      <Navbar />

      {/* Header */}
      <div className="relative z-10 pt-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Playground</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Analysis Tool
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Explore powerful tools to understand and optimize your codebase. Select the tool that fits your needs.
          </p>
        </div>
      </div>

      {/* Cards Container */}
      <div className="relative z-10 min-h-[70vh] flex items-center justify-center px-8 py-20">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLAYGROUND_ITEMS.map((item) => (
              <PlaygroundCard
                key={item.id}
                {...item}
                isHovered={hoveredCard === item.id}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}