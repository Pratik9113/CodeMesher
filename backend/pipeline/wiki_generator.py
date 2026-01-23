import os
import json
import requests
import re
from typing import List, Dict, Any, Tuple, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

class WikiPipeline:
    def __init__(self, github_token: str, google_api_key: str = None, model_name: str = None):
        self.github_token = github_token
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if github_token and "REPLACE" not in github_token:
            self.headers["Authorization"] = f"token {github_token}"
            
        # Support for multiple keys (Parallel processing)
        # We can take a mix of Groq and Gemini keys
        self.groq_keys = [k.strip() for k in (os.getenv("GROQ_API_KEYS") or os.getenv("GROQ_API_KEY") or "").split(',') if k.strip()]
        self.gemini_keys = [k.strip() for k in (os.getenv("GOOGLE_API_KEY") or "").split(',') if k.strip()]

        self.all_keys = self.groq_keys + self.gemini_keys
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        if self.all_keys:
            print(f"Using {len(self.all_keys)} API keys ({len(self.groq_keys)} Groq, {len(self.gemini_keys)} Gemini) for Parallel Wiki Generation!")
            # Default LLM for non-parallel fallback
            self.llm = self._get_llm_for_key(self.all_keys[0])
        else:
            raise ValueError("No API keys found in environment. Please set GROQ_API_KEY or GOOGLE_API_KEY.")

        self.ignore_patterns = [
            '.git', '.github', 'node_modules', 'venv', '__pycache__', 
            'dist', 'build', '.env', 'package-lock.json', 'yarn.lock'
        ]

    def _get_llm_for_key(self, api_key: str):
        """Dynamic LLM factory based on API key type."""
        if api_key.startswith('gsk_'):
            return ChatGroq(model_name=self.groq_model, groq_api_key=api_key, temperature=0.2)
        else:
            # Assume Gemini for other keys
            return ChatGoogleGenerativeAI(model=self.gemini_model, google_api_key=api_key, temperature=0.2)

    def _compress_code(self, code: str) -> str:
        """Strip comments and excessive whitespace to save tokens."""
        import re
        if not code: return ""
        # Remove single line comments
        code = re.sub(r'#.*$', '', code, flags=re.MULTILINE) # Python
        code = re.sub(r'//.*$', '', code, flags=re.MULTILINE) # JS/TS
        # Remove multi-line comments
        code = re.sub(r'/\*(.*?)\*/', '', code, flags=re.DOTALL)
        code = re.sub(r'\'\'\'(.*?)\'\'\'', '', code, flags=re.DOTALL)
        code = re.sub(r'\"\"\"(.*?)\"\"\"', '', code, flags=re.DOTALL)
        # Remove excessive blank lines
        lines = [l for l in code.splitlines() if l.strip()]
        return "\n".join(lines)

    def _should_process(self, path: str) -> bool:
        for pattern in self.ignore_patterns:
            if pattern in path:
                return False
        # Filter for code files (simplified)
        valid_extensions = ('.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.cpp', '.h', '.cs')
        return path.endswith(valid_extensions)

    def _normalize_repo_url(self, repo_url: str) -> str:
        """Normalize GitHub repository URL to git clone format, robust against doubling."""
        if not repo_url:
            return ""
            
        # Regex to find the first occurrence of a github URL
        # Matches: https://github.com/owner/repo or github.com/owner/repo
        pattern = r'(https?://)?github\.com/[\w\-\.]+/[\w\-\.]+'
        match = re.search(pattern, repo_url)
        
        if match:
            clean_url = match.group(0)
            if not clean_url.startswith('http'):
                clean_url = 'https://' + clean_url
            # Add .git if missing
            if not clean_url.endswith('.git'):
                clean_url += '.git'
            return clean_url
            
        # Fallback to current logic for slug-only or non-standard URLs
        repo_url = repo_url.strip().strip('/')
        if repo_url.startswith('https://') or repo_url.startswith('http://'):
            return repo_url.strip().replace('.git', '') + '.git'
        return 'https://github.com/' + repo_url + '.git'



    def _parse_repo_slug(self, repo_url: str) -> str:
        """Best-effort extraction of owner/repo from a repo URL."""
        u = (repo_url or "").strip()
        # Common shapes:
        # - https://github.com/owner/repo
        # - https://github.com/owner/repo.git
        # - git@github.com:owner/repo.git
        if "github.com" in u:
            # SSH
            if "github.com:" in u:
                slug = u.split("github.com:", 1)[1]
            else:
                # HTTPS
                slug = u.split("github.com/", 1)[1] if "github.com/" in u else u
            slug = slug.strip("/")
            if slug.endswith(".git"):
                slug = slug[:-4]
            # Remove possible extra path components after repo name
            parts = slug.split("/")
            if len(parts) >= 2:
                return f"{parts[0]}/{parts[1]}"
        return u

    def _safe_rmtree(self, path: str) -> None:
        """Best-effort remove tree on Windows (handles read-only + transient locks)."""
        import shutil
        import stat
        import time

        def _onerror(func, p, exc_info):
            try:
                os.chmod(p, stat.S_IWRITE)
                func(p)
            except Exception:
                pass

        max_retries = 5
        for attempt in range(max_retries):
            try:
                if os.path.exists(path):
                    shutil.rmtree(path, onerror=_onerror)
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(0.4 * (attempt + 1))
                else:
                    print(f"Warning: Could not clean up temp directory {path}: {e}")

    def _cluster_root_files(self, files_data: Dict[str, str]) -> Dict[str, Dict[str, str]]:
        """If repo has many files in root, create meaningful groups for the sidebar."""
        groups: Dict[str, Dict[str, str]] = {}

        def add(group: str, path: str, content: str) -> None:
            if group not in groups:
                groups[group] = {}
            groups[group][path] = content

        for path, content in files_data.items():
            lower = path.lower()
            ext = os.path.splitext(lower)[1].lstrip(".")

            # Keyword-based buckets first
            if any(k in lower for k in ["route", "router", "api", "controller", "handler", "endpoint"]):
                add("API & Routes", path, content)
                continue
            if any(k in lower for k in ["model", "schema", "entity", "db", "database", "migration"]):
                add("Data & Models", path, content)
                continue
            if any(k in lower for k in ["auth", "login", "jwt", "token", "session", "oauth"]):
                add("Auth & Security", path, content)
                continue
            if any(k in lower for k in ["util", "helper", "common", "shared", "core"]):
                add("Core & Utilities", path, content)
                continue
            if any(k in lower for k in ["test", "spec"]):
                add("Tests", path, content)
                continue
            if any(k in lower for k in ["config", "settings", "env", "docker", "compose"]):
                add("Config & Ops", path, content)
                continue

            # Fallback: language buckets
            if ext in ["py"]:
                add("Python", path, content)
            elif ext in ["ts", "tsx"]:
                add("TypeScript", path, content)
            elif ext in ["js", "jsx"]:
                add("JavaScript", path, content)
            elif ext in ["java"]:
                add("Java", path, content)
            elif ext in ["go"]:
                add("Go", path, content)
            elif ext in ["cpp", "c", "h", "hpp"]:
                add("C/C++", path, content)
            elif ext in ["cs"]:
                add("C#", path, content)
            else:
                add("Misc", path, content)

        # If everything fell into one bucket, keep as Root Module
        if len(groups) <= 1:
            return {"Root Module": dict(files_data)}

        # Always keep deterministic ordering in later steps
        return groups

    def fetch_repo_files(self, repo_url: str) -> Tuple[Dict[str, str], Dict[str, Any]]:
        """Fetch file contents by cloning the repo (bypasses API limits).

        Returns (files_data, meta).
        """
        import tempfile
        import shutil
        import subprocess
        import time
        from datetime import datetime, timezone
        
        # Normalize the URL
        normalized_url = self._normalize_repo_url(repo_url)
        repo_slug = self._parse_repo_slug(normalized_url)
        
        # Create a temp directory
        temp_dir = tempfile.mkdtemp()
        clone_dir = os.path.join(temp_dir, "repo")
        try:
            print(f"Cloning {normalized_url} to {clone_dir}...")
            
            # Simple git clone - depth 1 for speed
            result = subprocess.run(
                ["git", "clone", "--depth", "1", normalized_url, clone_dir],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            if result.returncode != 0:
                error_msg = result.stderr if result.stderr else result.stdout
                raise Exception(f"Git clone failed: {error_msg}")

            files_data = {}
            file_count = 0
            
            # Walk through the directory
            for root, _, files in os.walk(clone_dir):
                if file_count >= 40: break # Hard limit
                
                for file in files:
                    if file_count >= 40: break
                    
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, clone_dir)
                    
                    if self._should_process(rel_path):
                        try:
                            # Skip if file is too large (>50KB)
                            if os.path.getsize(file_path) > 50000: continue
                            
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                if content.strip(): # Skip empty files
                                    files_data[rel_path] = content
                                    file_count += 1
                        except Exception as e:
                            print(f"Skipping {rel_path}: {e}")
            
            if len(files_data) == 0:
                raise Exception("No code files found in repository. Please ensure the repository contains valid code files.")
            
            print(f"Successfully processed {len(files_data)} files.")

            # Try to get commit hash for UI footer
            commit = None
            try:
                rev = subprocess.run(
                    ["git", "-C", clone_dir, "rev-parse", "--short", "HEAD"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if rev.returncode == 0:
                    commit = (rev.stdout or "").strip() or None
            except Exception:
                commit = None

            meta = {
                "repo_url": repo_url,
                "repo": repo_slug,
                "commit": commit,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "file_count": len(files_data),
            }

            return files_data, meta
            
        except subprocess.TimeoutExpired:
            raise Exception("Git clone timed out. The repository may be too large or the connection is slow.")
        except FileNotFoundError:
            raise Exception("Git is not installed or not in PATH. Please install Git to use this feature.")
        except Exception as e:
            print(f"Error cloning repo: {e}")
            raise Exception(f"Failed to fetch repository: {str(e)}")
        finally:
            # Cleanup with Windows-friendly retries
            self._safe_rmtree(temp_dir)

    def _identify_core_logic(self, code: str) -> str:
        """Extract only the most 'logic-dense' parts of a file.
        Uses a heuristic density scorer (ML-style ranking) to find key sections.
        """
        lines = code.split('\n')
        scored_lines = []
        
        # Stop words and boilerplate to ignore
        ignore_keywords = {'import', 'from', 'export', 'require', 'const', 'let', 'var', 'self', 'this'}
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or stripped.startswith(('#', '//', '*', '/')):
                continue
            
            # Simple ML-style heuristic: logic density
            # More complex lines (with logic operators, assignments, function calls) get higher scores
            score = 0
            if any(op in stripped for op in ['if ', 'for ', 'while ', 'return ', 'await ', 'async ', '= ']):
                score += 5
            if any(sym in stripped for sym in ['{', '(', '[', ':']):
                score += 2
            
            # Count unique meaningful words (TF-IDF inspired)
            words = set(stripped.lower().split()) - ignore_keywords
            score += len(words)
            
            scored_lines.append((score, line))
        
        # Sort by score and take the top N most important lines, preserving order
        top_lines = sorted(scored_lines, key=lambda x: x[0], reverse=True)[:50]
        # Sort back to original order
        result_lines = [l for _, l in sorted(top_lines, key=lambda x: lines.index(x[1]))]
        
        return "\n".join(result_lines)

    def _extract_code_structure(self, code: str, file_path: str) -> str:
        """Smarter structural extraction with semantic filtering"""
        ext = file_path.split('.')[-1].lower() if '.' in file_path else ''
        structure_parts = []
        
        # 1. First, try structural extraction (signatures)
        if ext in ['py']:
            patterns = [r'^class\s+(\w+)', r'^def\s+(\w+)']
            for line in code.split('\n'):
                for p in patterns:
                    match = re.search(p, line.strip())
                    if match: structure_parts.append(line.strip())
        
        elif ext in ['js', 'jsx', 'ts', 'tsx']:
            patterns = [r'export\s+(class|interface|type|function|const)\s+(\w+)']
            for line in code.split('\n'):
                for p in patterns:
                    match = re.search(p, line.strip())
                    if match: structure_parts.append(line.strip())

        # 2. If signature list is short, add 'Core Logic' (Selective dense lines)
        if len(structure_parts) < 10:
            compressed = self._compress_code(code)
            core_logic = self._identify_core_logic(compressed)
            return "\n".join(structure_parts) + "\n\n--- CORE LOGIC SNIPPETS ---\n" + core_logic
        
        return "\n".join(structure_parts[:25])

    def _chunk_content(self, contents: List[str], max_chunk_size: int = 15000) -> List[str]:
        """Split content into manageable chunks for LLM processing"""
        chunks = []
        current_chunk = []
        current_size = 0
        
        for content in contents:
            content_size = len(content)
            
            # If single file is too large, truncate it
            if content_size > max_chunk_size:
                content = content[:max_chunk_size] + "\n... [truncated]"
                content_size = len(content)
            
            if current_size + content_size > max_chunk_size and current_chunk:
                chunks.append("\n\n---\n\n".join(current_chunk))
                current_chunk = [content]
                current_size = content_size
            else:
                current_chunk.append(content)
                current_size += content_size
        
        if current_chunk:
            chunks.append("\n\n---\n\n".join(current_chunk))
        
        return chunks

    def summarize_module(self, module_name: str, file_contents: List[str], file_paths: List[str] = None) -> str:
        """Summarize a group of files (module) using Gemini with smart chunking"""
        if not file_contents:
            return f"No content available for {module_name}."
        
        # First pass: Extract structure from each file
        if file_paths and len(file_paths) == len(file_contents):
            structured_content = []
            for code, path in zip(file_contents, file_paths):
                structure = self._extract_code_structure(code, path)
                structured_content.append(f"File: {path}\n{structure}")
            
            # Use structured content for summarization (much smaller)
            combined_structure = "\n\n".join(structured_content)
        else:
            # Fallback: use chunking strategy
            combined_structure = "\n\n".join(file_contents)
        
        # Limit total content to avoid token limits
        max_content_length = 20000  # Safe limit for Gemini
        if len(combined_structure) > max_content_length:
            combined_structure = combined_structure[:max_content_length] + "\n\n... [content truncated for summarization]"
        
        # Use proper placeholders for LangChain
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a senior technical writer creating code documentation. Write concise, informative wiki-style documentation.\n\nCRITICAL: Do NOT include generic titles like 'Content', 'Summary', or the module name as a header. Start directly with the descriptive content. Use standard markdown for formatting (bold, lists, etc.) but keep it professional.\n\nFocus on:\n1. What this module does (purpose)\n2. Key components (classes, functions, interfaces)\n3. How it fits into the larger system\n4. Important patterns or conventions used.\n\nWrite 2-4 paragraphs."),
            ("user", "Module: {module_name}\n\nCode Structure:\n```\n{code}\n```\n\nGenerate wiki-style documentation for this module. Start directly with the content, no headers.")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        try:
            return chain.invoke({"module_name": module_name, "code": combined_structure})
        except Exception as e:
            error_msg = str(e)
            # Provide helpful error message for model not found
            if "not found" in error_msg.lower() or "404" in error_msg:
                return f"Failed to summarize {module_name}: Model not found. Please check your GEMINI_MODEL environment variable. Try 'gemini-pro' or 'gemini-1.5-pro'. Error: {error_msg}"
            return f"Failed to summarize {module_name}: {error_msg}"

    def _parse_combined_response(self, response: str, module_names: List[str]) -> Dict[str, str]:
        """Parse the combined LLM response into individual module summaries.
        """
        summaries = {}
        
        # Check for explicit OVERVIEW: marker
        if "OVERVIEW:" in response:
            overview_part = response.split("OVERVIEW:")[1].split("MODULE:")[0]
            summaries["Overview"] = overview_part.strip()
        
        # Split by MODULE: markers
        parts = response.split("MODULE:")
        
        # If no explicit marker, first part might be overview or intro text
        if "Overview" not in summaries and parts[0].strip():
            summaries["Overview"] = parts[0].strip()
        
        # Process each module section
        raw_sections = []
        for part in parts[1:]:
            lines = part.strip().split('\n', 1)
            if len(lines) >= 1:
                title = lines[0].strip()
                content = lines[1].strip() if len(lines) > 1 else ""
                raw_sections.append((title, content))

        # Map contents back to module names
        if len(raw_sections) == len(module_names):
            for i, (title, content) in enumerate(raw_sections):
                summaries[module_names[i]] = f"TITLE_FIX:{title}\n{content}"
        else:
            # Fuzzy match attempt
            for title, content in raw_sections:
                for module_name in module_names:
                    if module_name.lower() in title.lower() or title.lower() in module_name.lower():
                        summaries[module_name] = f"TITLE_FIX:{title}\n{content}"
                        break
        
        return summaries

    def aggregate_modules(self, files_data: Dict[str, str]) -> Dict[str, Dict[str, str]]:
        """Group files by their top-level directory, preserving file paths.

        If most files are in root, cluster them into meaningful groups.
        """
        modules = {}
        for path, content in files_data.items():
            parts = path.split('/')
            if len(parts) > 1:
                module = parts[0]
            else:
                module = "root"
            
            if module not in modules:
                modules[module] = {}
            modules[module][path] = content

        # If everything ended up in root, create better sidebar groups
        if set(modules.keys()) == {"root"}:
            return self._cluster_root_files(files_data)

        # If root is huge compared to other modules, also split it
        if "root" in modules and len(modules["root"]) >= 15:
            root_groups = self._cluster_root_files(modules["root"])
            # Merge back: replace root module with split groups
            del modules["root"]
            for k, v in root_groups.items():
                modules[k] = v

        return modules

    def _generate_overview_parallel(self, repo_info: str, all_modules_text: str, api_key: str) -> str:
        """Helper to generate a high-level overview using a specific API key with retry logic."""
        import time
        max_retries = 3
        retry_delay = 90  # 1.5 minutes as requested
        
        for attempt in range(max_retries):
            try:
                llm = self._get_llm_for_key(api_key)
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """You are a world-class Technical Architect.
Your task is to provide a HIGH-LEVEL ARCHITECTURAL OVERVIEW of a software repository based on the provided module map.

OVERVIEW:
[A minimum of 3 detailed paragraphs providing a high-level architectural survey of the entire repository. Discuss the primary tech stack, structural patterns, and the system's core purpose.]

1. BE VERBOSE. Provide dense technical insight.
2. STAFF ENGINEER LEVEL. Focus on state management, concurrency, data flow, and scalability.
"""),
                    ("user", "Repository Info:\n{repo_info}\n\nModules Map:\n{all_modules_text}")
                ])
                chain = prompt | llm | StrOutputParser()
                return chain.invoke({"repo_info": repo_info, "all_modules_text": all_modules_text})
            except Exception as e:
                err_str = str(e).lower()
                if ("rate limit" in err_str or "429" in err_str) and attempt < max_retries - 1:
                    print(f"⚠️ Rate limit hit for Overview. Waiting {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                    continue
                return f"Error generating overview: {str(e)}"
        return "Error: Maximum retries exceeded for overview."

    def _summarize_module_parallel(self, module_name: str, module_text: str, api_key: str) -> str:
        """Helper to summarize a single module using a specific API key with retry logic."""
        import time
        max_retries = 3
        retry_delay = 90  # 1.5 minutes as requested
        
        for attempt in range(max_retries):
            try:
                llm = self._get_llm_for_key(api_key)
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """You are a Staff Technical Documentarian. 
You are synthesizing logic snippets for a SINGLE module into a PREMIUM technical wiki section.

STRICT OUTPUT FORMAT:
MODULE: [Product-Oriented System Name]
[A substantial architectural summary of this module's role.]

SUBSECTION: [Specific Component/Logic]
[Deep technical analysis. Explain HOW it works, why it's implemented this way, and its dependencies.]
```[language]
// Most critical code segment
```

---
INSTRUCTIONS:
1. BE VERBOSE. Use dense technical insight.
2. STAFF ENGINEER LEVEL. Focus on data flow and modularity."""),
                    ("user", "Logic Extracts for Module: {module_name}\n\n{module_text}")
                ])
                chain = prompt | llm | StrOutputParser()
                return chain.invoke({"module_name": module_name, "module_text": module_text})
            except Exception as e:
                err_str = str(e).lower()
                if ("rate limit" in err_str or "429" in err_str) and attempt < max_retries - 1:
                    print(f"⚠️ Rate limit hit for {module_name}. Waiting {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                    continue
                return f"Error generating module {module_name}: {str(e)}"
        return f"Error: Maximum retries exceeded for module {module_name}."

    def generate_wiki(self, repo_url: str) -> Dict[str, Any]:
        """Main pipeline execution with PARALLEL module processing using multiple API keys."""
        from concurrent.futures import ThreadPoolExecutor
        
        print(f"1. Fetching files for {repo_url}...")
        files_data, meta = self.fetch_repo_files(repo_url)
        
        print("2. Aggregating modules...")
        modules = self.aggregate_modules(files_data)
        
        wiki_sections: List[Dict[str, Any]] = []

        # Prepare module data for parallel processing
        print(f"3. Generating summaries in parallel using {len(self.all_keys)} keys...")
        
        module_tasks = []
        for module_name, files_dict in modules.items():
            if not files_dict: continue
            
            # Increase visibility: take top 7 files
            sorted_files = sorted(files_dict.items(), key=lambda x: len(x[1]) if x[1] else 0, reverse=True)[:7] 
            structured_content = [f"File: {p}\n{self._extract_code_structure(c, p)}" for p, c in sorted_files]
            module_text = f"### MODULE: {module_name}\n" + "\n\n".join(structured_content)
            module_tasks.append((module_name, module_text))

        all_paths = sorted(files_data.keys())
        repo_info = f"Repository: {meta.get('repo') or meta.get('repo_url')}\nStructure (sample):\n" + "\n".join([f"- {p}" for p in all_paths[:20]])
        all_modules_text = "\n".join([f"- {m}" for m in modules.keys()])

        try:
            with ThreadPoolExecutor(max_workers=len(self.all_keys) or 5) as executor:
                # 1. Overview task
                overview_key = self.all_keys[0]
                overview_future = executor.submit(self._generate_overview_parallel, repo_info, all_modules_text, overview_key)
                
                # 2. Module tasks (rotating keys)
                module_futures = []
                for i, (m_name, m_text) in enumerate(module_tasks):
                    key = self.all_keys[i % len(self.all_keys)]
                    module_futures.append(executor.submit(self._summarize_module_parallel, m_name, m_text, key))
                
                # Collect Overview
                overview_text = overview_future.result()
                overview_paras = [p.strip() for p in overview_text.split("\n\n") if p.strip()]
                wiki_sections.append({
                    "id": "overview",
                    "title": "Overview",
                    "content": overview_paras if overview_paras else [overview_text.strip()],
                })

                # Collect Modules
                for i, (m_name, _) in enumerate(module_tasks):
                    raw_summary = module_futures[i].result()
                    
                    # Extraction logic
                    title = m_name.capitalize()
                    summary = raw_summary
                    if "MODULE:" in raw_summary:
                        parts = raw_summary.split("\n", 1)
                        title = parts[0].replace("MODULE:", "").strip()
                        summary = parts[1].strip() if len(parts) > 1 else ""

                    sub_parts = summary.split("SUBSECTION:")
                    main_content = sub_parts[0].strip()
                    children = []
                    
                    for sub_part in sub_parts[1:]:
                        lines = sub_part.strip().split('\n', 1)
                        if not lines[0]: continue
                        sub_title = lines[0].strip()
                        sub_body = lines[1].strip() if len(lines) > 1 else ""
                        sub_paras = [p.strip() for p in sub_body.split('\n\n') if p.strip()]
                        children.append({
                            "id": f"{m_name}-{sub_title}".lower().replace(' ', '-').replace('_', '-').replace('/', '-'),
                            "title": sub_title,
                            "content": sub_paras
                        })

                    main_paras = [p.strip() for p in main_content.split('\n\n') if p.strip()]
                    if not main_paras and not children:
                        main_paras = ["No detailed summary available for this module."]

                    wiki_sections.append({
                        "id": m_name.lower().replace(' ', '-').replace('_', '-'),
                        "title": title,
                        "content": main_paras,
                        "children": children if children else None
                    })

            print(f"✅ Parallel generation complete! Speedup: ~{len(self.all_keys)}x")
            
        except Exception as e:
            print(f"❌ Error during parallel generation: {e}")
            wiki_sections.append({"id": "error", "title": "Error", "content": [str(e)]})
            
        return {"meta": meta, "sections": wiki_sections, "files_data": files_data}