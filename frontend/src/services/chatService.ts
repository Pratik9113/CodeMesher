const BASE_API_URL = import.meta.env.VITE_API_URL || "https://codemesherbackend.onrender.com";

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export async function chatApiFetch(path: string, body?: unknown, method: "POST" | "GET" = "POST", timeoutMs = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${BASE_API_URL}${path}`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
        clearTimeout(id);
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }
        if (!res.ok) throw new Error(JSON.stringify({ status: res.status, body: data }));
        return data;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}
