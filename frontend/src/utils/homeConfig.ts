import { Zap, GitBranch, Brain, Eye, Code2, Network } from 'lucide-react';
import type React from 'react';

export interface Feature {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}

export const HOME_FEATURES: Feature[] = [
    {
        icon: GitBranch,
        title: 'Repository Structure',
        description: 'Visualize the structure of your codebase with interactive diagrams that reveal the architecture at a glance.',
    },
    {
        icon: Network,
        title: 'Dependency Mapping',
        description: 'Discover how different parts of your code depend on each other with beautiful, interactive network graphs.',
    },
    {
        icon: Code2,
        title: 'Code Analysis',
        description: 'Get AI-powered insights into code quality, complexity, and patterns to improve your development workflow.',
    },
    {
        icon: Brain,
        title: 'Architecture Visualization',
        description: 'Understand the high-level architecture of your application with customizable, shareable diagrams.',
    },
    {
        icon: Eye,
        title: 'Smart Insights',
        description: 'Leverage advanced AI to get recommendations, detect issues, and understand complex codebases faster.',
    },
    {
        icon: Zap,
        title: 'Real-time Analytics',
        description: 'Monitor code metrics and performance indicators in real-time for better development decisions.',
    },
];
