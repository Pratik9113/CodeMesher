import type { WikiSection } from '../types';

export const DUMMY_WIKI_DATA: WikiSection[] = [
    {
        id: "overview",
        title: "System Overview",
        content: [
            "Welcome to the CodeMesher technical documentation. This repository constitutes a state-of-the-art distributed systems platform designed for high-throughput message processing and real-time data synchronization. The architecture is built on a modular micro-services foundation, leveraging Gemini AI for semantic analysis and Llama 3 for rapid summarization.",
            "### Architectural Pillars",
            "1. **Semantic Analysis**: We don't just read code; we understand it. By using logic density scoring, the system identifies the 'heartbeat' of the repository, ignoring boilerplate and focusing on business-critical logic.",
            "2. **Real-time Pipeline**: Our ingestion engine leverages asynchronous task queues to clone, analyze, and summarize repositories in parallel, ensuring that even large codebases are documented in under 60 seconds.",
            "3. **Dynamic Visualization**: The frontend is more than a wiki; it's a living map of your code. Architecture diagrams are generated on-the-fly using Mermaid.js based on extracted dependency graphs.",
            "### Technology Stack",
            "The backend is powered by **FastAPI and LangChain**, providing a robust framework for AI orchestration. The frontend is a modern **React + Vite** application, styled with **Tailwind CSS** for a premium, responsive experience. Data integrity is managed through a hybrid approach of localized JSON caches and high-performance vector stores for semantic search.",
            "This documentation is partitioned into several key modules, accessible via the sidebar. Each module encapsulates a specific domain of the system, providing deep-dive technical insights and critical code snippets."
        ]
    },
    {
        id: "core-logic",
        title: "Core Application Logic",
        content: [
            "This module serves as the 'Brain' of the application. It encapsulates the core state machines and orchestration logic that coordinate the entire data flow from raw GitHub URL to a polished technical wiki.",
            "We utilize a 'Logic Density' heuristic to prioritize code analysis. Instead of processing every line of code (which is token-expensive and noisy), the system identifies blocks with high cyclomatic complexity and business-critical operations (like database commits, API calls, and state transitions)."
        ],
        children: [
            {
                id: "event-system",
                title: "Real-time Event System and Sharding",
                content: [
                    "The event orchestration system handles asynchronous communication between the Python backend and the React frontend. It uses a custom-built sharding algorithm to ensure that large repositories are processed in parallel without blocking the main event loop.",
                    "Each shard is responsible for a specific 'Semantic Cluster' of files. For example, one shard might handle all API/Routes while another handles Data Models. This allows the AI to maintain localized context for better summarization.",
                    "```python\nasync def process_shard(shard_id, file_list):\n    \"\"\"\n    Processes a specific cluster of files using logic density scoring.\n    Ensures that high-value symbols are extracted first.\n    \"\"\"\n    results = []\n    for file in sorted(file_list, key=lambda f: f.score, reverse=True):\n        density = calculate_logic_density(file.content)\n        if density > THRESHOLD:\n            summary = await ai_summarize(file, context=results)\n            results.append(summary)\n    return aggregate_results(results)\n```"
                ]
            },
            {
                id: "data-integrity",
                title: "Core Business Logic and Data Integrity",
                content: [
                    "Data integrity is maintained through a series of transactional operations. This component manages the lifecycle of a 'Wiki Project', ensuring that partial generations are handled gracefully and that the local cache is always consistent with the upstream GitHub state.",
                    "We implement a 'Compare-and-Swap' (CAS) pattern for metadata updates to prevent race conditions during concurrent generation requests. This is particularly important when multiple users are analyzing the same repository simultaneously."
                ]
            },
            {
                id: "utilities",
                title: "Core Utilities and Library Functions",
                content: [
                    "The utility layer provides low-cost, high-reliability functions for string manipulation, date formatting, and GitHub API normalization. This includes our custom 'Semantic Parser' which cleans up AI responses and ensures they follow the Wiki JSON schema.",
                    "```javascript\n// Example of our normalization utility used in the generator\nfunction normalizeRepoUrl(url) {\n    const cleanUrl = url.trim().replace(/\\.git$/, '');\n    if (cleanUrl.startsWith('github.com/')) {\n        return `https://\${cleanUrl}.git`;\n    }\n    return cleanUrl.endsWith('.git') ? cleanUrl : `\${cleanUrl}.git`;\n}\n```"
                ]
            }
        ]
    }
];
