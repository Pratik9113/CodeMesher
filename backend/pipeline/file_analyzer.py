# Add/replace these methods in your FileAnalyzer class file (pipeline/file_analyzer.py)

import subprocess
import textwrap
import hashlib
import time
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple
import re
import requests

from dotenv import load_dotenv
import os

# Load variables from .env into environment
load_dotenv()

class FileAnalyzer:
    def _compress_code(self, code: str) -> str:
        """Strip comments and excessive whitespace to save tokens."""
        if not code: return ""
        # Remove single line comments
        code = re.sub(r'#.*$', '', code, flags=re.MULTILINE) # Python
        code = re.sub(r'//.*$', '', code, flags=re.MULTILINE) # JS/TS
        # Remove multi-line comments (simplified)
        code = re.sub(r'\'\'\'(.*?)\'\'\'', '', code, flags=re.DOTALL)
        code = re.sub(r'\"\"\"(.*?)\"\"\"', '', code, flags=re.DOTALL)
        code = re.sub(r'/\*(.*?)\*/', '', code, flags=re.DOTALL)
        # Remove excessive blank lines
        lines = [l for l in code.splitlines() if l.strip()]
        return "\n".join(lines)

    # ... existing methods ...

    def analyze_code_string(self, code_content: str) -> Dict[str, Any]:
        """
        Produce a structured analysis of the provided code string.
        Returns a dict with keys:
          - summary: short natural-language summary
          - language: best-guess language
          - metrics: lines, non-empty lines, complexity, imports, exports counts
          - top_identifiers: most common identifier names (heuristic)
          - functions: list of found functions with line numbers (best-effort)
          - classes: list of found classes with line numbers (best-effort)
          - issues: obvious issues (var usage, console.log, TODOs, eval, security patterns)
          - suggestions: actionable improvements (formatting, tests, docstrings, types)
          - tests_to_add: list of suggested unit/integration tests
          - refactor_steps: prioritized refactor actions
          - security: security risks and immediate mitigations
        """
        content = code_content or ""
        if not content.strip():
            return {"error": "Empty code content provided."}

        # basic metrics
        lines = content.splitlines()
        total_lines = len(lines)
        non_empty_lines = len([l for l in lines if l.strip()])
        blank_lines = total_lines - non_empty_lines

        # simple complexity estimation (counts of control keywords)
        complexity_keywords = ['if', 'elif', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', 'await', 'async', 'yield']
        complexity_score = 1 + sum(content.count(k) for k in complexity_keywords)

        # detect language heuristically by extension-like tokens
        language = "Unknown"
        if re.search(r'^\s*import\s+[\w\.]+', content, re.MULTILINE) or re.search(r'\bdef\b', content):
            # could be Python or JS/TS; refine:
            if re.search(r'^\s*def\s+\w+\s*\(', content, re.MULTILINE) or re.search(r'^\s*class\s+\w+\s*:', content, re.MULTILINE):
                language = "Python"
            elif re.search(r'\bconsole\.log\b', content) or re.search(r'export\s+', content) or re.search(r'import\s+.*from', content):
                language = "JavaScript/TypeScript"
            else:
                # choose Python if def/class present
                language = "Python" if re.search(r'\bdef\b|\bself\b', content) else "JavaScript/TypeScript"
        elif '<html' in content.lower() or content.strip().startswith('<!doctype'):
            language = "HTML"
        elif re.search(r'\bfunction\b|\bconsole\.log\b|\bmodule\.exports\b', content):
            language = "JavaScript/TypeScript"

        # extract simple functions & classes (best-effort)
        functions = []
        classes = []
        if language.startswith("Python"):
            for m in re.finditer(r'^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:', content, re.MULTILINE):
                functions.append({
                    "name": m.group(1),
                    "signature": m.group(0).strip(),
                    "line": content[:m.start()].count('\n') + 1
                })
            for m in re.finditer(r'^class\s+([A-Za-z_]\w*)\s*(\([^)]*\))?\s*:', content, re.MULTILINE):
                classes.append({
                    "name": m.group(1),
                    "inherits": m.group(2).strip('()') if m.group(2) else None,
                    "line": content[:m.start()].count('\n') + 1
                })
        else:
            # JS/TS heuristics
            for m in re.finditer(r'function\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*{', content):
                functions.append({
                    "name": m.group(1),
                    "type": "function_declaration",
                    "line": content[:m.start()].count('\n') + 1
                })
            for m in re.finditer(r'([A-Za-z_]\w*)\s*=\s*\([^)]*\)\s*=>', content):
                functions.append({
                    "name": m.group(1),
                    "type": "arrow_function",
                    "line": content[:m.start()].count('\n') + 1
                })
            for m in re.finditer(r'class\s+([A-Za-z_]\w*)', content):
                classes.append({
                    "name": m.group(1),
                    "line": content[:m.start()].count('\n') + 1
                })

        # imports & exports counts (heuristic)
        imports = re.findall(r'^\s*(?:import|from)\s+.+', content, re.MULTILINE)
        exports = re.findall(r'^\s*export\s+.+', content, re.MULTILINE)
        requires = re.findall(r'require\s*\(\s*[\'"][^\'"]+[\'"]\s*\)', content)

        # crudely collect identifiers and top tokens
        tokens = re.findall(r'[A-Za-z_]\w*', content)
        # filter out common keywords to surface identifiers
        common_keywords = set([
            'def', 'return', 'if', 'else', 'for', 'while', 'class', 'import',
            'from', 'const', 'let', 'var', 'function', 'async', 'await', 'new',
            'try', 'except', 'finally', 'with', 'public', 'private', 'protected',
            'interface', 'export', 'module', 'require'
        ])
        identifiers = [t for t in tokens if t not in common_keywords and not t.isupper() and len(t) > 1]
        top_identifiers = [name for name, _ in Counter(identifiers).most_common(10)]

        # detect obvious issues
        issues = []
        if 'var ' in content:
            issues.append("Uses `var` — consider `let`/`const`.")
        if 'console.log' in content:
            issues.append("Console logging present — remove or gate logs for production.")
        if 'eval(' in content:
            issues.append("Use of `eval()` detected — security risk.")
        if re.search(r'innerHTML\s*=', content):
            issues.append("Direct `innerHTML` usage — potential XSS.")
        if re.search(r'\bTODO\b', content) or re.search(r'#\s*TODO', content):
            issues.append("TODO comments present — incomplete work.")
        if re.search(r'password|secret|api[_-]?key', content, re.IGNORECASE):
            issues.append("Possible hard-coded secrets present — remove and use environment variables.")

        # testing & CI suggestions
        tests_to_add = []
        if functions:
            tests_to_add.append("Unit tests for each public function to cover expected inputs and edge cases.")
        if language.startswith("Python"):
            tests_to_add.append("Add pytest-based unit tests and a tox/CI job to run tests on commits.")
        elif language.startswith("JavaScript"):
            tests_to_add.append("Add Jest or Vitest unit tests and configure CI to run them.")

        # refactor suggestions (prioritized)
        refactor_steps = []
        if complexity_score > 20:
            refactor_steps.append("Break large functions into smaller, single-responsibility functions.")
        if any(len(f['name']) > 40 for f in functions):
            refactor_steps.append("Shorten long identifier names and standardize naming conventions.")
        if 'console.log' in content:
            refactor_steps.append("Replace console.log with a logging framework or structured logger.")

        # security recommendations
        security = []
        if 'eval(' in content:
            security.append({"risk": "eval", "recommendation": "Remove eval and use safer parsers or explicit logic."})
        if re.search(r'fetch\(|axios\(', content) and re.search(r'http://', content):
            security.append({"risk": "Unencrypted HTTP", "recommendation": "Use HTTPS for network requests."})
        if re.search(r'innerHTML', content):
            security.append({"risk": "XSS", "recommendation": "Sanitize inputs and prefer textContent / safe templating."})

        # suggestions for immediate improvements
        suggestions = []
        if not any(line.strip().startswith(('#', '//', '/*')) for line in lines[:5]):
            suggestions.append("Add a file header comment describing purpose and author.")
        if language.startswith("Python") and not re.search(r'if\s+__name__\s*==\s*[\'\"]__main__[\'\"]', content):
            suggestions.append("If executable as script, add `if __name__ == '__main__':` guard.")
        if language.startswith("JavaScript") and not re.search(r'/\*\*|\/\/', content):
            suggestions.append("Add JSDoc or inline comments for public functions.")

        # produce a concise summary
        summary_lines = [
            f"Detected language: {language}",
            f"Lines: {total_lines} (non-empty {non_empty_lines})",
            f"Functions: {len(functions)}, Classes: {len(classes)}",
            f"Imports: {len(imports)}, Exports: {len(exports)}, Requires: {len(requires)}",
            f"Estimated complexity score: {complexity_score}"
        ]
        summary = " | ".join(summary_lines)

        analysis = {
            "summary": summary,
            "language": language,
            "metrics": {
                "total_lines": total_lines,
                "non_empty_lines": non_empty_lines,
                "blank_lines": blank_lines,
                "complexity_score": complexity_score,
                "import_count": len(imports),
                "export_count": len(exports),
                "require_count": len(requires)
            },
            "top_identifiers": top_identifiers,
            "functions": functions,
            "classes": classes,
            "issues": issues,
            "suggestions": suggestions,
            "tests_to_add": tests_to_add,
            "refactor_steps": refactor_steps,
            "security": security,
            # include a short content fingerprint so users can identify the snapshot
            "content_fingerprint": hashlib.sha1(content.encode('utf-8')).hexdigest()[:10],
            "generated_at": int(time.time())
        }

        return analysis

    def generate_llm_prompt(self, analysis: Dict[str, Any], file_content: Optional[str] = None, max_content_chars: int = 2500) -> str:
        """
        Generate a token-efficient prompt for code analysis.
        """
        if not analysis or "summary" not in analysis:
            return "Error: incomplete analysis provided."

        meta = textwrap.dedent(f"""\
        Context: {analysis.get('summary')}
        Language: {analysis.get('language')} | Complexity: {analysis['metrics']['complexity_score']}
        Static Issues: {', '.join(analysis.get('issues', []) or ['None'])}
        """).strip()

        tasks = textwrap.dedent("""\
        Goal: Provide a concise (Staff Engineer level) review.
        1) Summary: 2 sentences on purpose/logic.
        2) Issues: Security or logic bugs only.
        3) Improvement: Prioritized refactor steps + tiny code snippets for fixes.
        4) Test: 2 specific edge cases + expected behavior.
        """).strip()

        code_block = ""
        if file_content:
            compressed = self._compress_code(file_content)
            snippet = compressed if len(compressed) <= max_content_chars else compressed[:max_content_chars] + "\n/* ...truncated... */"
            code_block = f"\n\n### Logic Snippets\n```\n{snippet}\n```"

        return f"{meta}\n\n{tasks}{code_block}"
    
    
    def analyze_with_llm(self, file_content: str, model: str = "deepseek-coder:6.7b", timeout: int = 240) -> Dict[str, Any]:
        """
        Send full file content to Ollama for AI-based analysis.
        Returns the model's structured natural-language output.
        """
        if not file_content.strip():
            return {"ok": False, "error": "Empty file content."}

        # --- Step 1: Build prompt ---
        prompt = textwrap.dedent(f"""
        You are an expert software engineer and senior code reviewer.
        Analyze the following code and provide a professional structured report.

        Include these sections:
        1. <Language> — detect the main programming language.
        2. <Summary> — short paragraph describing the purpose of the file.
        3. <Findings> — list of bugs, issues, or smells.
        4. <Improvements> — list of improvements and refactor ideas.
        5. <TestsToAdd> — unit/integration test ideas with brief examples.
        6. <Security> — highlight any vulnerabilities and fixes.
        7. <Complexity> — estimate complexity and maintainability level.
        8. <RefactorPlan> — prioritized actionable steps.

        Be specific and concise. Use Markdown formatting for readability.

        --- CODE START ---
        {file_content[:12000]}  # truncated for safety
        --- CODE END ---
        """).strip()

        # --- Step 2: Run Ollama ---
        try:
            process = subprocess.run(
                ["ollama", "run", model],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            if process.returncode != 0:
                return {"ok": False, "error": process.stderr.strip() or f"Ollama exited with code {process.returncode}"}

            return {"ok": True, "output": process.stdout.strip()}

        except FileNotFoundError:
            return {"ok": False, "error": "`ollama` CLI not found. Install Ollama or fix PATH."}
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": f"Ollama model '{model}' timed out after {timeout}s."}
        except Exception as e:
            return {"ok": False, "error": f"Unexpected error: {e}"}

# # Helper: example function to run Ollama via CLI
# def call_ollama(prompt: str, model: str = "deepseek-coder:6.7b", timeout: int = 120) -> Dict[str, Any]:
#     """
#     Calls the local `ollama` CLI to run a model with the provided prompt.
#     Returns a dict: {"ok": True, "output": "..."} or {"ok": False, "error": "..."}.

#     NOTES:
#     - This uses `ollama run <model> --prompt "<prompt>"`. Ensure `ollama` CLI is installed
#       and you're authenticated/able to run the chosen model locally.
#     - If you prefer the HTTP API, replace this implementation to POST to your local Ollama server.
#     """
#     try:
#         # Make sure the prompt is a single string; avoid shell interpolation by passing arguments as list
#         # We pass the prompt via stdin to avoid shell escaping issues.
#         process = subprocess.run(
#             ["ollama", "run", model, "--prompt", prompt],
#             capture_output=True,
#             text=True,
#             timeout=timeout
#         )
#         if process.returncode != 0:
#             return {"ok": False, "error": process.stderr.strip() or f"ollama exited {process.returncode}"}
#         return {"ok": True, "output": process.stdout.strip()}
#     except FileNotFoundError:
#         return {"ok": False, "error": "`ollama` CLI not found. Install Ollama or use another execution method."}
#     except subprocess.TimeoutExpired:
#         return {"ok": False, "error": "Ollama call timed out."}
#     except Exception as e:
#         return {"ok": False, "error": str(e)}



def call_ollama(prompt: str, model: str = "deepseek-coder:6.7b", timeout: int = 120) -> Dict[str, Any]:
    """
    Calls the local Ollama model via CLI by piping the prompt to stdin.
    Works with modern Ollama CLI versions (>= v0.1.29+).
    """
    import subprocess

    try:
        process = subprocess.run(
            ["ollama", "run", model],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if process.returncode != 0:
            return {
                "ok": False,
                "error": process.stderr.strip() or f"ollama exited {process.returncode}"
            }

        return {"ok": True, "output": process.stdout.strip()}

    except FileNotFoundError:
        return {"ok": False, "error": "`ollama` CLI not found. Install Ollama or update PATH."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Ollama call timed out."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


import requests
import json
# def call_ollama_http(prompt: str, model: str = "deepseek-coder:6.7b", timeout: int = 180):
#     try:
#         url = "http://127.0.0.1:11434/api/generate"
#         payload = {"model": model, "prompt": prompt}
#         response = requests.post(url, json=payload, timeout=timeout)
#         response.raise_for_status()

#         # Ollama streams responses, so join partials if necessary
#         # output_lines = []
#         # for line in response.text.splitlines():
#         #     try:
#         #         data = json.loads(line)
#         #         if "response" in data:
#         #             output_lines.append(data["response"])
#         #     except json.JSONDecodeError:
#         #         continue

#         return {"ok": True, "output": "".join(response)}

#     except requests.exceptions.RequestException as e:
#         return {"ok": False, "error": f"Ollama HTTP error: {e}"}



def call_ollama_http(prompt: str, model: str = "tinyllama:1.1b", timeout: int = 180) -> Dict[str, Any]:
    """
    Calls a local Ollama model for text generation using the HTTP API.
    
    Parameters:
        prompt (str): The prompt or instruction to send to the model.
        model (str): The Ollama model to use (e.g., "codellama:7b", "deepseek-coder:6.7b").
        timeout (int): Timeout for the API call in seconds.
    
    Returns:
        dict: { "ok": True, "output": "<text>" } or { "ok": False, "error": "<error message>" }
    """
    try:
        url = "http://127.0.0.1:11434/api/generate"
        payload = {"model": model, "prompt": prompt}


        print("payload", payload)
        
        # Streamed response from Ollama
        with requests.post(url, json=payload, stream=True, timeout=timeout) as response:
            response.raise_for_status()

            output_lines = []
            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if "response" in data:
                        output_lines.append(data["response"])
                except json.JSONDecodeError:
                    continue

            output = "".join(output_lines).strip()
            return {"ok": True, "output": output or "No response content."}

    except requests.exceptions.Timeout:
        return {"ok": False, "error": f"Ollama request timed out after {timeout}s."}
    except requests.exceptions.RequestException as e:
        return {"ok": False, "error": f"Ollama HTTP error: {e}"}
    except Exception as e:
        return {"ok": False, "error": f"Unexpected error: {e}"}
    

    

def call_groq(prompt: str, model: str = "llama-3.3-70b-versatile", api_key: str = None, timeout: int = 120) -> Dict[str, Any]:
    """
    Calls the Groq API for text generation using the given model.
    
    Parameters:
        prompt (str): The prompt or instruction to send to the model.
        model (str): The Groq model to use (e.g., "llama3-70b", "mixtral-8x7b").
        api_key (str): Your Groq API key (if not provided, it should be set as an environment variable GROQ_API_KEY).
        timeout (int): Timeout for the API call in seconds.
    
    Returns:
        dict: { "ok": True, "output": "<text>" } or { "ok": False, "error": "<error message>" }
    """
    import os

    # Use environment variable if no key provided
    api_key = api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"ok": False, "error": "Missing Groq API key. Set GROQ_API_KEY env variable or pass `api_key`."}

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert software engineer and code reviewer."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1500
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=timeout)

        if response.status_code != 200:
            return {"ok": False, "error": f"Groq API error {response.status_code}: {response.text}"}

        data = response.json()
        output = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return {"ok": True, "output": output or "No response content."}

    except requests.exceptions.Timeout:
        return {"ok": False, "error": f"Groq API request timed out after {timeout}s."}
    except Exception as e:
        return {"ok": False, "error": f"Unexpected error: {e}"}
# ---------------------------
# Usage example:
# ---------------------------
# analyzer = FileAnalyzer(root_path=".")
# analysis = analyzer.analyze_code_string(code_content)
# if "error" in analysis:
#     # handle error
#     pass
# llm_prompt = analyzer.generate_llm_prompt(analysis, file_content=code_content, max_content_chars=4000)
# resp = call_ollama(llm_prompt, model="ggml-gpt4o-mini")
# if resp["ok"]:
#     print("LLM output:\n", resp["output"])
# else:
#     print("LLM error:", resp["error"])
