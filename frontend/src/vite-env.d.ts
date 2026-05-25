/// <reference types="vite/client" />

declare global {
  interface Window {
    api?: {
      openFile: () => Promise<{ filePath: string; content: string } | null>;
      saveFile: (payload: { filePath?: string; content: string }) => Promise<{ filePath?: string; error?: string } | null>;
      openFolder: () => Promise<{ folderPath: string; children: { name: string; path: string; isDir: boolean }[] } | null>;
      readDir: (dirPath: string) => Promise<{ name: string; path: string; isDir: boolean }[] | { error: string }>;
      readFile: (filePath: string) => Promise<{ filePath: string; content: string } | { error: string } | null>;
      aiChat: (
        messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
        provider?: 'auto' | 'openai' | 'ollama',
        model?: string
      ) => Promise<{ role: 'assistant'; content: string; proposed?: string }>;
      analyzeScan: (folderPath: string) => Promise<{ folderPath: string; files: { path: string; size: number }[] } | { error: string }>;
      analyzeCollectText: (folderPath: string, maxBytesPerFile?: number) => Promise<{ outPath: string; bytes: number; fileCount: number } | { error: string }>;
      analyzeOllamaExtract: (filePath: string, instruction?: string, model?: string) => Promise<{ result: string } | { error: string }>;
      analyzeExportInsights: (data: string, outPath?: string) => Promise<{ outPath: string } | { error: string } | null>;
      analyzeExplain: (
        input: string,
        rootDir: string,
        model?: string,
        provider?: 'auto' | 'openai' | 'ollama',
        opts?: { maxDepth?: number; maxFiles?: number; maxBytesPerFile?: number }
      ) => Promise<{
        rootFile: string;
        files: { path: string; size: number; bytes: number }[];
        explanation: string;
        insights: string;
      } | { error: string }>;

      // Terminal
      termStart: (opts: { id: string; command: string; args?: string[]; cwd?: string; env?: any; name?: string }) => Promise<{ ok: true } | { error: string }>;
      termWrite: (id: string, data: string) => Promise<{ ok: true } | { error: string }>;
      termStop: (id: string) => Promise<{ ok: true } | { error: string }>;
      onTermOutput: (cb: (payload: { id: string; stream: 'stdout' | 'stderr'; data: string; ts: string }) => void) => () => void;
      onTermExit: (cb: (payload: { id: string; code: number; ts: string }) => void) => () => void;
      onTermError: (cb: (payload: { id: string; error: string; ts: string }) => void) => () => void;
    };
  }
}

export { };
