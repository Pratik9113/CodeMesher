import json
import os
import sys
from typing import Any, Dict, List, Optional, Tuple
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import requests
import traceback

from dotenv import load_dotenv
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_community.chat_message_histories import ChatMessageHistory

# Load environment variables first
load_dotenv()

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Set up path for pipeline imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'pipeline'))
from file_analyzer import FileAnalyzer, call_groq, call_ollama, call_ollama_http
from wiki_generator import WikiPipeline
from query_analysis import QueryAnalyzer
from retriever import CodeRetriever

# Get environment variables after loading .env
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GITHUB_API_URL = "https://api.github.com/repos"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


app = Flask(__name__)
CORS(app)



file_history_store = {}  # file_path → ChatMessageHistory
repo_files_store = {}   # repo_url → files_data (dict)
STATIC_SESSION_ID = "static-session-1"





@app.route('/')
def home():
    return "Hello! Flask with Python 3.9 is running!"


@app.route('/generate-wiki', methods=['POST'])
def generate_wiki():
    try:
        data = request.get_json(force=True, silent=True)
        if not data or 'repo_url' not in data:
            return jsonify({"error": "Missing repo_url"}), 400
        
        repo_url = data['repo_url']
        
        # Check if we have either Gemini or Groq keys
        has_gemini = GOOGLE_API_KEY and "REPLACE" not in GOOGLE_API_KEY
        has_groq = GROQ_API_KEY and "REPLACE" not in GROQ_API_KEY
        
        if not has_gemini and not has_groq:
             return jsonify({"error": "Neither GOOGLE_API_KEY nor GROQ_API_KEY is set in backend .env"}), 500

        pipeline = WikiPipeline(github_token=GITHUB_TOKEN, google_api_key=GOOGLE_API_KEY)
        wiki_result = pipeline.generate_wiki(repo_url)

        # wiki_result: {"meta": {...}, "sections": [...], "files_data": {...}}
        if repo_url and "files_data" in wiki_result:
            repo_files_store[repo_url] = wiki_result["files_data"]

        return jsonify(
            {
                "success": True,
                "meta": wiki_result.get("meta", {}),
                "sections": wiki_result.get("sections", []),
            }
        ), 200
    except Exception as e:
        print(f"Wiki generation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/analyze-file', methods=['POST'])
def analyze_file():
    try:
        print("starting point")
        # --- Step 1: Parse request body ---
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Invalid or missing JSON body"}), 400

        file_path = data.get('file_path')
        file_content = data.get('file_content')
        root_path = data.get('root_path', '/')

        print("file_path:", file_path)
        print("has_file_content:", file_content is not None)
        print("root_path:", root_path)

        # --- Step 2: Get code content either from request or GitHub ---
        code_content = None
        if file_content:
            code_content = file_content
        elif file_path and root_path and "/" in root_path:
            owner, repo = root_path.split("/", 1)
            encoded_path = file_path.lstrip("/")  # remove leading slash if any
            branch = "main"  # or get dynamically if needed
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}?ref={branch}"

            headers = {"Accept": "application/vnd.github.v3.raw"}
            if GITHUB_TOKEN:
                headers["Authorization"] = f"token {GITHUB_TOKEN}"

            try:
                print(f"📡 Fetching from: {url}")
                print(f"Headers: {json.dumps(headers, indent=2)}")

                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code != 200:
                    print(f"GitHub error: {response.text}")
                    return jsonify({"error": f"GitHub API error: {response.text}"}), 400

                code_content = response.text
                print(f"Fetched {len(code_content)} bytes from GitHub")

            except requests.exceptions.RequestException as e:
                print(f"GitHub request exception: {e}")
                return jsonify({"error": f"GitHub fetch failed: {str(e)}"}), 400
        
        # Validate that we have code content
        if not code_content:
            return jsonify({"error": "No file content provided and unable to fetch from GitHub. Please provide file_content or valid file_path with root_path."}), 400

        # --- Step 3: Run static code analysis (metrics, complexity, etc.) ---
        analyzer = FileAnalyzer()
        analysis = analyzer.analyze_code_string(code_content)

        if "error" in analysis:
            return jsonify({"error": analysis["error"]}), 400

        # --- Step 4: Generate prompt and call Groq for advanced analysis ---
        llm_prompt  = analyzer.generate_llm_prompt(analysis, file_content=code_content, max_content_chars=4000)
        result = call_groq(llm_prompt, model="llama-3.3-70b-versatile") 
        # result = call_ollama_http(llm_prompt, model= "tinyllama:1.1b")
        print("result, ,,,,, ", result)

        if not result["ok"]:
            print("❌ LLM Error:", result["error"])
            return jsonify({"error": result["error"], "static_analysis": analysis}), 500

        # --- Step 5: Return combined static + AI-based analysis ---
        return jsonify({
            "success": True,
            "model_used": "llama3-70b-8192",
            "static_analysis": analysis,
            "ai_analysis": result["output"],
            "fetched_file_content_preview": code_content[:2000]
        }), 200

    except Exception as e:
        print(f"⚠️ Unexpected failure: {str(e)}")
        return jsonify({"error": f"Unexpected failure: {str(e)}"}), 500



# @app.route('/ask-anything', methods=['POST'])
# def ask_anything():
#     try:
#         print("🚀 Starting /ask-anything")

#         # --- Step 1: Parse JSON ---
#         data = request.get_json(force=True, silent=True)
#         if not data:
#             return jsonify({"error": "Invalid or missing JSON body"}), 400

#         file_path = data.get('file_path')
#         root_path = data.get('root_path', '/')
#         user_message = data.get('message')  # User's custom question
#         file_content = data.get('file_content', None)

#         if not file_path:
#             return jsonify({"error": "Missing file_path"}), 400
#         if not user_message:
#             return jsonify({"error": "Missing message/question"}), 400

#         print(f"file_path: {file_path}")
#         print(f"root_path: {root_path}")
#         print(f"user_message: {user_message}")

#         # --- Step 2: Fetch code content if not provided ---
#         code_content = file_content
#         if not code_content:
#             if "/" in root_path:
#                 owner, repo = root_path.split("/", 1)
#                 encoded_path = file_path.lstrip("/")
#                 branch = "main"
#                 url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}?ref={branch}"

#                 headers = {"Accept": "application/vnd.github.v3.raw"}
#                 if GITHUB_TOKEN:
#                     headers["Authorization"] = f"token {GITHUB_TOKEN}"

#                 try:
#                     print(f"📡 Fetching file from: {url}")
#                     response = requests.get(url, headers=headers, timeout=10)
#                     if response.status_code != 200:
#                         return jsonify({"error": f"GitHub API error: {response.text}"}), 400
#                     code_content = response.text
#                 except requests.exceptions.RequestException as e:
#                     return jsonify({"error": f"GitHub fetch failed: {str(e)}"}), 400
#             else:
#                 return jsonify({"error": "Invalid root_path format. Expected owner/repo"}), 400

#         # --- Step 3: Build the prompt ---
#         prompt = f"""
#                 You are an expert code assistant.
#                 Here is the content of a source file. The user will ask a question about it.

#                 -------------------
#                 {code_content[:8000]}  # limit to 8k chars to avoid overflow
#                 -------------------

#                 User's question:
#                 "{user_message}"

#                 Please provide a clear, prcised, and accurate answer about this file, referring to relevant functions, logic, or classes.
#                 If the question is unclear, state what additional info is needed.
#                 """

#         # --- Step 4: Call LLM (Groq / Ollama etc.) ---
#         result = call_groq(prompt, model="llama-3.3-70b-versatile")
#         # result = call_ollama_http(prompt, model="deepseek-coder:6.7b")

#         if not result.get("ok"):
#             return jsonify({"error": result.get("error", "Unknown LLM error")}), 500

#         # --- Step 5: Return plain answer ---
#         return jsonify({
#             "success": True,
#             "answer": result["output"], 
#             "model_used": "llama-3.3-70b-versatile"
#         }), 200

#     except Exception as e:
#         print(f"⚠️ Unexpected failure: {str(e)}")
#         return jsonify({"error": f"Unexpected failure: {str(e)}"}), 500





# ==========================================
# Helper: Fetch file from GitHub if needed
# ==========================================
def fetch_github_file(owner, repo, path, branch="main"):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    headers = {"Accept": "application/vnd.github.v3.raw"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    r = requests.get(url, headers=headers, timeout=10)
    if r.status_code != 200:
        raise Exception(f"GitHub fetch failed: {r.text}")
    return r.text

# ======================================================
# Route: ask-anything
# ======================================================
@app.route("/ask-anything", methods=["POST", "OPTIONS"])
def ask_anything():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Invalid or missing JSON"}), 400

        file_path = data.get("file_path")
        root_path = data.get("root_path", "")
        user_message = data.get("message")
        file_content = data.get("file_content")

        if not file_path or not user_message:
            return jsonify({"error": "Missing file_path or message"}), 400

        # Step 1: Fetch file content if not given
        if not file_content:
            if "/" not in root_path:
                return jsonify({"error": "Invalid root_path format (expected owner/repo)."}), 400
            owner, repo = root_path.split("/", 1)
            file_content = fetch_github_file(owner, repo, file_path)

        # Step 2: Load/create chat history
        if file_path not in file_history_store:
            file_history_store[file_path] = ChatMessageHistory()
        chat_history: BaseChatMessageHistory = file_history_store[file_path]

        # Step 3: Define system + prompt
        system_message = SystemMessage(content=(
            "You are an expert AI code assistant. "
            "Analyze the given source code, explain it, detect bugs or improvements, "
            "and answer naturally like a developer."
        ))

        prompt = ChatPromptTemplate.from_messages([
            system_message,
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])

        # Step 4: Create Groq LLM
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            api_key=GROQ_API_KEY
        )

        # Step 5: Connect history with Runnable
        def get_session_history(session_id: str) -> BaseChatMessageHistory:
            return file_history_store[file_path]

        runnable = RunnableWithMessageHistory(
            runnable=prompt | llm,  # ✅ Combine prompt and llm properly
            get_session_history=get_session_history,
            input_messages_key="input",        # this matches {input}
            history_messages_key="history"     # matches MessagesPlaceholder
        )

        # Step 6: Build user input (code + question)
        user_input = f"""
                You are an expert software developer and AI assistant. Your goal is to help the user
                Here is the file content:

                -------------------
                {file_content[:8000]}
                -------------------

                User question:
                "{user_message}"

                If more detail is needed, say:
                "Would you like me to go deeper into any part of this file?"
        """

        # Step 7: Invoke model (this time passes 'history' correctly)
        output = runnable.invoke(
            {"input": user_input},
            config={"configurable": {"session_id": STATIC_SESSION_ID}}
        )

        # Step 8: Return response
        return jsonify({
            "success": True,
            "answer": output.content if hasattr(output, "content") else str(output),
            "model_used": "Groq + LangChain",
            "session_id": STATIC_SESSION_ID,
            "file_path": file_path
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/wiki-chat', methods=['POST', 'OPTIONS'])
def wiki_chat():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json(force=True, silent=True)
        if not data or 'repo_url' not in data or 'message' not in data:
            return jsonify({"error": "Missing repo_url or message"}), 400
        
        repo_url = data['repo_url']
        user_message = data['message']
        
        # 1. Check if we have files for this repo
        files_data = repo_files_store.get(repo_url)
        if not files_data:
            return jsonify({"error": "Repository not found in cache. Please generate the wiki first."}), 404
        
        # 2. Retrieve relevant files using QueryAnalyzer (TF-IDF)
        analyzer = QueryAnalyzer(files_data)
        relevant_files = analyzer.find_relevant_files(user_message, top_k=5)
        
        # 3. Get snippets using CodeRetriever
        retriever = CodeRetriever(relevant_files)
        snippets = retriever.get_snippets(max_lines=150) # Use smaller chunks for chat
        
        # 4. Prepare prompt for LLM
        context_text = ""
        for s in snippets[:8]: # Limit number of snippets
            context_text += f"\n--- File: {s['file_path']} ---\n{s['code']}\n"
            
        system_prompt = """You are an expert software architect and developer. 
You are answering questions about a specific code repository. 
Below are some relevant code snippets from the repo. 
Use them to provide a detailed, accurate, and helpful answer. 
If the information isn't in the snippets, use your general knowledge but clarify what is specific to the snippets vs general knowledge."""

        user_prompt = f"""Repository URL: {repo_url}
User Question: "{user_message}"

Relevant Code Snippets:
{context_text}

Answer the user question based on the snippets above:"""

        # 5. Call LLM
        # We'll use Groq if available, else fallback
        if GROQ_API_KEY:
            result = call_groq(f"{system_prompt}\n\n{user_prompt}", model="llama-3.3-70b-versatile")
            answer = result.get("output", "I'm sorry, I couldn't generate an answer.")
        elif GOOGLE_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)
            res = llm.invoke(f"{system_prompt}\n\n{user_prompt}")
            answer = res.content
        else:
            return jsonify({"error": "No LLM API keys configured"}), 500

        return jsonify({
            "success": True,
            "answer": answer,
            "sources": [f[0] for f in relevant_files]
        }), 200

    except Exception as e:
        print(f"Wiki chat failed: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/share-wiki', methods=['POST', 'OPTIONS'])
def share_wiki():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        data = request.get_json(force=True, silent=True)
        if not data or 'email' not in data or 'sections' not in data:
            return jsonify({"error": "Missing email or sections data"}), 400
        
        target_email = data['email']
        sections = data['sections']
        meta = data.get('meta', {})
        repo_url = meta.get('repo_url', 'Unknown Repository')
        
        # Email configuration
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = os.getenv("EMAIL_USER")
        sender_password = os.getenv("EMAIL_PASS")
        
        if not sender_email or not sender_password:
            return jsonify({"error": "Backend email credentials not configured (EMAIL_USER/EMAIL_PASS)"}), 500

        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"CodeMesher Wiki <{sender_email}>"
        msg['To'] = target_email
        msg['Subject'] = f"Code Wiki: {repo_url.split('/')[-1]}"
        
        # Build HTML content
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                Code Wiki: {repo_url}
            </h1>
            <p style="color: #666; font-size: 0.9em;">Generated on: {meta.get('generated_at', 'N/A')}</p>
        """
        
        for section in sections:
            html_content += f"""
            <div style="margin-top: 30px;">
                <h2 style="color: #1e293b; background: #f8fafc; padding: 10px; border-radius: 5px;">
                    {section.get('title', 'Untitled')}
                </h2>
                <div style="line-height: 1.6; color: #475569;">
            """
            for content_item in section.get('content', []):
                # Basic check for code blocks to wrap them in pre tags
                if content_item.strip().startswith('```'):
                    code = content_item.replace('```', '').strip()
                    html_content += f"<pre style='background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto;'>{code}</pre>"
                else:
                    html_content += f"<p>{content_item}</p>"
            
            html_content += "</div></div>"
            
        html_content += f"""
            <hr style="margin-top: 50px; border: 0; border-top: 1px solid #e5e7eb;" />
            <p style="text-align: center; color: #94a3b8; font-size: 0.8em;">
                Sent via CodeMesher • Automated Documentation Generator
            </p>
        </div>
        """
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            
        return jsonify({"success": True, "message": "Email sent successfully!"}), 200
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500







# ===== Model prompt & parsing helpers =====
def _detect_fence_language(file_path: str) -> str:
    """Return a best-effort markdown fence language based on file extension."""
    lower = (file_path or "").lower()
    if lower.endswith(('.ts', '.tsx')):
        return 'typescript'
    if lower.endswith('.js'):
        return 'javascript'
    if lower.endswith(('.py')):
        return 'python'
    if lower.endswith(('.java')):
        return 'java'
    if lower.endswith(('.go')):
        return 'go'
    if lower.endswith(('.rs')):
        return 'rust'
    if lower.endswith(('.kt')):
        return 'kotlin'
    if lower.endswith(('.cpp', '.cc', '.cxx')):
        return 'cpp'
    if lower.endswith('.c'):
        return 'c'
    if lower.endswith('.rb'):
        return 'ruby'
    if lower.endswith('.php'):
        return 'php'
    if lower.endswith('.cs'):
        return 'csharp'
    return ''


def _extract_selection_text(current: str, selection: Optional[Dict[str, Any]]) -> Optional[str]:
    """Extract the selected substring from the current file based on 1-based coordinates.

    If selection is None or invalid, returns None.
    """
    if not current or not selection:
        return None
    try:
        lines = current.splitlines()
        s_line = int(selection.get('start_line'))
        s_col = int(selection.get('start_col'))
        e_line = int(selection.get('end_line'))
        e_col = int(selection.get('end_col'))
        if s_line < 1 or e_line < 1 or s_line > len(lines) or e_line > len(lines):
            return None
        if (e_line, e_col) < (s_line, s_col):
            return None
        # Convert to 0-based indices internally
        s_li = s_line - 1
        e_li = e_line - 1
        if s_li == e_li:
            return lines[s_li][max(0, s_col - 1):e_col - 1 if e_col > 0 else None]
        parts: List[str] = []
        parts.append(lines[s_li][max(0, s_col - 1):])
        for  li in range(s_li + 1, e_li):
            parts.append(lines[li])
        parts.append(lines[e_li][:max(0, e_col - 1)])
        return "\n".join(parts)
    except Exception:
        return None
    


def buildPrompt(payload: Dict[str, Any]) -> str:
    """Combine incoming fields into a single, highly structured prompt.

    Notes to maximize model accuracy:
    - Provide a clear role/system section
    - Provide strict response format with JSON schema-like instructions
    - Delimit content with explicit sentinels and code fences
    - Emphasize: return ONLY JSON, no extra commentary
    """

    system = payload.get("system", "You are a helpful programming assistant.")
    history: List[str] = payload.get("history", []) or []
    current: str = payload.get("current", "")
    file_path: str = payload.get("file_path", "")
    selection: Optional[Dict[str, Any]] = payload.get("selection")
    user_instruction: str = payload.get("user", "")
    mode: str = payload.get("mode", "inline")

    # Build a strongly guided prompt that instructs the model to emit JSON only
    # and includes the full file/selection context.
    sections: List[str] = []
    sections.append("<<SYSTEM>>\n" + system.strip())

    if history:
        # Join recent history as prior messages or snippets
        sections.append("<<HISTORY>>\n" + "\n".join(str(h) for h in history))

    sections.append("<<FILE_PATH>>\n" + file_path)
    sections.append("<<MODE>>\n" + mode)

    if selection:
        sel = selection
        selection_block = (
            f"start_line={sel.get('start_line')} start_col={sel.get('start_col')}\n"
            f"end_line={sel.get('end_line')} end_col={sel.get('end_col')}"
        )
        sections.append("<<SELECTION>>\n" + selection_block)

    # Include selection content if available for higher accuracy
    fence_lang = _detect_fence_language(file_path)
    selection_text = _extract_selection_text(current, selection)
    if selection_text:
        if fence_lang:
            sections.append("<<SELECTION_CONTENT>>\n```" + fence_lang + "\n" + selection_text + "\n```")
        else:
            sections.append("<<SELECTION_CONTENT>>\n```\n" + selection_text + "\n```")

    # Include current file contents in a fenced block to reduce formatting errors.
    if fence_lang:
        sections.append("<<CURRENT_FILE>>\n```" + fence_lang + "\n" + current + "\n```")
    else:
        sections.append("<<CURRENT_FILE>>\n```\n" + current + "\n```")

    # Explicit instruction to produce structured JSON only.
    sections.append(
        "<<INSTRUCTIONS>>\n"
        + user_instruction.strip()
        + "\n\n"
        + "Return ONLY valid JSON with this exact structure, no prose, no code fences:\n"
        + "{\n"
        + "  \"edits\": [\n"
        + "    {\n"
        + "      \"start_line\": <int>,\n"
        + "      \"start_col\": <int>,\n"
        + "      \"end_line\": <int>,\n"
        + "      \"end_col\": <int>,\n"
        + "      \"replacement\": \"<string with replacement code>\",\n"
        + "      \"explanation\": \"<brief explanation>\"\n"
        + "    }\n"
        + "  ],\n"
        + "  \"debug\": { \"prompt_used\": \"<echo the full prompt you used>\" }\n"
        + "}\n"
        + "Rules:\n"
        + "- Do not wrap JSON in code fences.\n"
        + "- Do not include trailing commas.\n"
        + "- Use double quotes for all strings.\n"
        + "- The replacement must be a plain string, not fenced.\n"
        + "- If selection is provided, restrict edits to that range.\n"
    )

    prompt = "\n\n".join(sections).strip()
    return prompt
def _extract_json_from_text(text: str) -> Optional[str]:
    """Try to extract a JSON object substring from arbitrary text.

    Handles common cases where the model returns extra text or wraps JSON in
    code fences. This is a best-effort JSON extraction for robustness.
    """
    if not text:
        return None

    # Fast path: if it looks like raw JSON
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped

    # Try fenced blocks: ```json ... ``` or ``` ... ```
    fence = "```"
    if fence in text:
        parts = text.split(fence)
        # Look for the first block that appears to be JSON
        for i in range(1, len(parts), 2):
            candidate = parts[i]
            # Drop possible language hint like 'json' at the start of block
            candidate = candidate.lstrip().split("\n", 1)
            candidate = candidate[1] if len(candidate) == 2 else candidate[0]
            candidate = candidate.strip()
            if candidate.startswith("{") and candidate.endswith("}"):
                return candidate

    # General brace matching ignoring braces inside quoted strings
    # Find the first balanced JSON object substring if present
    in_string = False
    escape = False
    depth = 0
    start_idx = -1
    for idx, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == '{':
                if depth == 0:
                    start_idx = idx
                depth += 1
            elif ch == '}':
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start_idx != -1:
                        candidate = text[start_idx : idx + 1].strip()
                        if candidate.startswith("{") and candidate.endswith("}"):
                            return candidate
    return None


def _validate_model_response(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure the object matches the expected shape. Coerce and filter as needed."""
    result: Dict[str, Any] = {"edits": [], "debug": {}}

    edits = obj.get("edits")
    if isinstance(edits, list):
        normalized_edits: List[Dict[str, Any]] = []
        for e in edits:
            if not isinstance(e, dict):
                continue
            required_keys = [
                "start_line",
                "start_col",
                "end_line",
                "end_col",
                "replacement",
            ]
            if not all(k in e for k in required_keys):
                continue
            try:
                normalized_edits.append(
                    {
                        "start_line": int(e["start_line"]),
                        "start_col": int(e["start_col"]),
                        "end_line": int(e["end_line"]),
                        "end_col": int(e["end_col"]),
                        "replacement": str(e["replacement"]),
                        "explanation": str(e.get("explanation", "")),
                    }
                )
            except Exception:
                # Skip invalid entries that cannot be coerced
                continue
        result["edits"] = normalized_edits

    debug = obj.get("debug")
    if isinstance(debug, dict):
        result["debug"] = debug

    return result



def parse_model_json_response(text: str, prompt_used: str) -> Dict[str, Any]:
    """Parse model text to JSON safely, with robust fallbacks.

    Returns a dict containing at least {"edits": [], "debug": {...}}.
    """
    parse_errors: List[str] = []

    # Attempt direct JSON parse
    try:
        direct = json.loads(text)
        if isinstance(direct, dict):
            parsed = _validate_model_response(direct)
            parsed.setdefault("debug", {})["prompt_used"] = prompt_used
            return parsed
    except Exception as exc:
        parse_errors.append(f"direct_json_error: {type(exc).__name__}: {exc}")

    # Attempt to extract a JSON object substring
    extracted = _extract_json_from_text(text)
    if extracted:
        try:
            extracted_obj = json.loads(extracted)
            if isinstance(extracted_obj, dict):
                parsed = _validate_model_response(extracted_obj)
                parsed.setdefault("debug", {})["prompt_used"] = prompt_used
                return parsed
        except Exception as exc:
            parse_errors.append(f"extracted_json_error: {type(exc).__name__}: {exc}")

    # Final fallback: return empty edits and include raw text for debugging
    return {
        "edits": [],
        "debug": {
            "prompt_used": prompt_used,
            "errors": parse_errors,
            "raw_text": text,
        },
    }


def callModelAPI(prompt: str) -> str:
    """Call a model provider with the given prompt and return the raw text.

    Providers supported via env MODEL_PROVIDER:
    - mock (default): returns a static, valid JSON result
    - openai / groq / hf / ollama: stubs prepared; require external deps/tokens

    For maximum accuracy, providers should be called with low temperature and
    JSON-only response settings where available.
    """
    provider = os.getenv("MODEL_PROVIDER", "mock").strip().lower()

    if provider == "mock":
        # Try to infer selection coordinates from the prompt to produce a visible edit
        start_line = 1
        start_col = 1
        end_line = 1
        end_col = 1
        try:
            # Very simple extraction from the structured prompt we build
            # Look for the <<SELECTION>> block
            sel_marker = "<<SELECTION>>"
            if sel_marker in prompt:
                sel_part = prompt.split(sel_marker, 1)[1].split("<<", 1)[0]
                # Lines like: start_line=X start_col=Y\nend_line=A end_col=B
                import re
                m = re.search(r"start_line=(\d+)\s+start_col=(\d+)", sel_part)
                n = re.search(r"end_line=(\d+)\s+end_col=(\d+)", sel_part)
                if m and n:
                    start_line, start_col = int(m.group(1)), int(m.group(2))
                    end_line, end_col = int(n.group(1)), int(n.group(2))
        except Exception:
            pass

        replacement = "// edit applied by mock provider\n"
        mock_obj = {
            "edits": [
                {
                    "start_line": start_line,
                    "start_col": start_col,
                    "end_line": end_line,
                    "end_col": end_col,
                    "replacement": replacement,
                    "explanation": "Inserted marker to demonstrate end-to-end edit",
                }
            ],
            "debug": {"prompt_used": prompt},
        }
        return json.dumps(mock_obj)

    # Lazy import requests only if a real HTTP call is attempted
    try:
        import requests  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        return json.dumps(
            {
                "edits": [],
                "debug": {
                    "prompt_used": prompt,
                    "errors": [
                        "requests_not_installed",
                        f"provider={provider}",
                        f"detail={type(exc).__name__}: {exc}",
                    ],
                },
            }
        )

    # Example stubs for real providers; user can configure tokens/endpoints
    headers: Dict[str, str] = {}
    temperature = float(os.getenv("MODEL_TEMPERATURE", "0"))

    if provider == "openai":  # Uses OpenAI's responses API if available
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if not api_key:
            return json.dumps(
                {
                    "edits": [],
                    "debug": {
                        "prompt_used": prompt,
                        "errors": ["missing OPENAI_API_KEY"],
                    },
                }
            )
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "input": prompt,
            # Prefer JSON-only outputs if the provider supports it; for
            # compatible models you could use `response_format={"type":"json_object"}`.
            # We keep it generic here to avoid SDK dependency.
            "temperature": temperature,
        }
        resp = requests.post(f"{base_url}/responses", headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        # Best-effort extraction; OpenAI responses API returns { output: [{content:[{type:'output_text', text:'...'}]}] }
        try:
            outputs = data.get("output", [])
            if outputs and isinstance(outputs, list):
                first = outputs[0]
                content = first.get("content", []) if isinstance(first, dict) else []
                if content and isinstance(content, list) and isinstance(content[0], dict):
                    text = content[0].get("text")
                    if isinstance(text, str):
                        return text
        except Exception:
            pass
        # Fallback: raw JSON
        return json.dumps(data)
    if provider == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        model = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:latest")
        payload = {"model": model, "prompt": prompt, "options": {"temperature": temperature}}
        resp = requests.post(f"{base_url}/api/generate", json=payload, timeout=120)
        resp.raise_for_status()
        # Ollama streams results by default; when using REST we may get a single JSON object per line
        try:
            # Concatenate streamed lines
            text_chunks: List[str] = []
            for line in resp.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if obj.get("done") and text_chunks:
                        break
                    part = obj.get("response", "")
                    if isinstance(part, str):
                        text_chunks.append(part)
                except Exception:
                    text_chunks.append(line)
            combined = "".join(text_chunks).strip()
            return combined
        except Exception:
            return resp.text

    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return json.dumps(
                {
                    "edits": [],
                    "debug": {"prompt_used": prompt, "errors": ["missing GROQ_API_KEY"]},
                }
            )
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": temperature}
        resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            return json.dumps(data)

    if provider == "hf":  # Hugging Face Inference
        api_key = os.getenv("HF_API_KEY", "")
        model = os.getenv("HF_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct")
        if not api_key:
            return json.dumps(
                {
                    "edits": [],
                    "debug": {"prompt_used": prompt, "errors": ["missing HF_API_KEY"]},
                }
            )
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"inputs": prompt, "parameters": {"temperature": temperature}}
        resp = requests.post(f"https://api-inference.huggingface.co/models/{model}", headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        # Some HF models return a simple string; others return list of dicts
        try:
            data = resp.json()
            if isinstance(data, list) and data and isinstance(data[0], dict) and "generated_text" in data[0]:
                return data[0]["generated_text"]
            if isinstance(data, dict) and "generated_text" in data:
                return str(data["generated_text"])  # type: ignore
            return json.dumps(data)
        except Exception:
            return resp.text

    # Unknown provider: echo input for debugging
    return json.dumps({"edits": [], "debug": {"prompt_used": prompt, "errors": [f"unknown provider: {provider}"]}})
def _validate_request_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Basic validation of the /edit request JSON payload."""
    required_fields = ["current", "file_path", "user", "mode"]
    for field in required_fields:
        if field not in payload:
            return False, f"missing field: {field}"
    sel = payload.get("selection")
    if sel is not None and not isinstance(sel, dict):
        return False, "selection must be an object if provided"
    return True, None


@app.route('/edit', methods=['POST'])
def edit():
    """Accept code-edit request, build prompt, call model, safely parse response."""
    try:
        payload = request.get_json(force=True, silent=False)  # Ensure JSON or raise
        if not isinstance(payload, dict):
            return jsonify({"error": "request body must be a JSON object"}), 400
    except Exception as exc:
        return jsonify({"error": f"invalid JSON body: {type(exc).__name__}: {exc}"}), 400

    ok, err = _validate_request_payload(payload)
    if not ok:
        return jsonify({"error": err}), 400

    # Build prompt and call model
    prompt = buildPrompt(payload)
    raw_text = callModelAPI(prompt)
    parsed = parse_model_json_response(raw_text, prompt_used=prompt)

    # Ensure we always return a JSON object with expected structure
    return jsonify(parsed), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
