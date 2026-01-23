import React, { useState, useEffect, useRef } from "react";
import ThreadSelector from "./chat/ThreadSelector";
import ChatMessage from "./chat/ChatMessage";
import ChatInput from "./chat/ChatInput";
import { type Message, chatApiFetch } from "../services/chatService";

interface Props {
  activeFile?: string;
  root?: { path: string };
  model?: string;
  provider?: string;
  code?: string;
  setMode?: (v: string) => void;
  setOriginalForDiff?: (v: string) => void;
  setProposedForDiff?: (v: string) => void;
}

const BUTTONS = [
  { key: "scan-workspace", label: "Scan Workspace", icon: "🔍" },
  { key: "build-corpus", label: "Build Corpus", icon: "📚" },
  { key: "ask-anything", label: "Ask Anything", icon: "💬" },
  { key: "analyze-file", label: "Analyze File", icon: "📄" },
  { key: "ai-analysis", label: "AI Analysis", icon: "🤖" },
  { key: "export-insights", label: "Export Insights", icon: "📤" },
];

export default function CodeMesher({
  activeFile,
  root,
  code,
  setMode,
  setOriginalForDiff,
  setProposedForDiff
}: Props) {
  const [draft, setDraft] = useState("");
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [chatThreads, setChatThreads] = useState<Record<string, Message[]>>({});
  const [currentThread, setCurrentThread] = useState<string>("ask-anything");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const setLoading = (k: string, v: boolean) => setLoadingMap((prev) => ({ ...prev, [k]: v }));

  // --- Persist threads in localStorage ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codemesher:threads");
      if (saved) setChatThreads(JSON.parse(saved));
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("codemesher:threads", JSON.stringify(chatThreads));
    } catch (e) { }
  }, [chatThreads]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatThreads, currentThread]);

  const messages = chatThreads[currentThread] || [];

  function addMessage(thread: string, msg: Message) {
    setChatThreads((prev) => ({
      ...prev,
      [thread]: [...(prev[thread] || []), msg],
    }));
  }

  async function sendUserMessage(thread: string, userText: string) {
    const userMsg: Message = { role: "user", content: userText };
    addMessage(thread, userMsg);
    setDraft("");

    try {
      let endpoint = "";
      let body: any = { root_path: root?.path, file_path: activeFile };

      switch (thread) {
        case "scan-workspace": endpoint = "/analyze-scan"; break;
        case "build-corpus":
          endpoint = "/analyze-collect-text";
          body.max_bytes = 150000;
          break;
        case "ask-anything":
          endpoint = "/ask-anything";
          body.message = userText;
          break;
        case "analyze-file":
        case "ai-analysis":
          endpoint = "/analyze-file";
          break;
        case "export-insights":
          endpoint = "/analyze-export-insights";
          body.insights = userText;
          break;
        default:
          endpoint = "/ask-anything";
          body.message = userText;
      }

      setLoading(thread, true);
      const res = await chatApiFetch(endpoint, body);
      setLoading(thread, false);

      const replyText =
        res.answer ||
        res.ai_analysis ||
        res.analysis ||
        res.llm_prompt ||
        JSON.stringify(res, null, 2);

      const aiMsg: Message = { role: "assistant", content: replyText };
      addMessage(thread, aiMsg);

      if (replyText.proposed && setMode && setOriginalForDiff && setProposedForDiff) {
        setOriginalForDiff(code || "");
        setProposedForDiff(replyText.proposed);
        setMode("diff");
      }
    } catch (e) {
      setLoading(thread, false);
      const errorMsg: Message = { role: "assistant", content: `❌ Error: ${String(e)}` };
      addMessage(thread, errorMsg);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <ThreadSelector
          buttons={BUTTONS}
          currentThread={currentThread}
          loadingMap={loadingMap}
          onThreadChange={setCurrentThread}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-40">
              <div className="text-6xl animate-bounce">💭</div>
              <div className="space-y-2">
                <p className="text-xl font-light tracking-tight text-white">Start a conversation</p>
                <p className="text-sm max-w-[250px] leading-relaxed">
                  Ask anything or analyze files. Some services are currently in refinement.
                </p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} index={i} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={() => sendUserMessage(currentThread, draft)}
          loading={!!loadingMap[currentThread]}
          placeholder={`Message ${BUTTONS.find((b) => b.key === currentThread)?.label}...`}
        />
      </div>
    </div>
  );
}
