export interface WikiSection {
    id: string;
    title: string;
    content: string[];
    children?: WikiSection[];
}

export interface WikiMeta {
    repo_url?: string;
    repo?: string;
    commit?: string | null;
    generated_at?: string;
    file_count?: number;
}