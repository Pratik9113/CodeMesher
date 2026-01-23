import { GitBranch, Code2, Book } from 'lucide-react';
import type React from 'react';

export interface PlaygroundItem {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    features: string[];
    to: string;
    colorScheme: 'purple' | 'blue' | 'green';
}

export const PLAYGROUND_ITEMS: PlaygroundItem[] = [
    {
        id: 'repovision',
        icon: GitBranch,
        title: 'RepoVision',
        description: 'Get a comprehensive overview of your entire GitHub repository. Visualize code structure, dependencies, and architecture patterns at a glance.',
        features: [
            'Interactive repository structure visualization',
            'Dependency graph and relationship mapping',
            'Real-time code statistics and metrics',
            'Architecture insights and recommendations'
        ],
        to: '/playground/repovision',
        colorScheme: 'purple'
    },
    {
        id: 'codeanalysis',
        icon: Code2,
        title: 'CodeAnalysis',
        description: 'Deep dive into function-level code analysis. Understand function complexity, performance bottlenecks, and optimization opportunities in your codebase.',
        features: [
            'Function complexity and cyclomatic analysis',
            'Performance metrics and bottleneck detection',
            'Code quality scoring and best practices',
            'AI-powered refactoring suggestions'
        ],
        to: '/playground/codeanalysis',
        colorScheme: 'blue'
    },
    {
        id: 'codewiki',
        icon: Book,
        title: 'CodeWiki',
        description: 'Automatically generated documentation for your codebase. Browse through detailed explanations of modules, APIs, and system architecture.',
        features: [
            'Auto-generated module documentation',
            'Architectural overviews and insights',
            'API endpoints and integration guides',
            'Interlinked code-level explanations'
        ],
        to: '/playground/codewiki',
        colorScheme: 'green'
    }
];
