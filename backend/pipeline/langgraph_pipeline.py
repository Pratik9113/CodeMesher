from typing import Annotated, Dict, List, TypedDict, Union, Any, Optional
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, HumanMessage
import os
import requests
import json
from wiki_generator import WikiPipeline
from file_analyzer import FileAnalyzer
from query_analysis import QueryAnalyzer
from retriever import CodeRetriever

class GraphState(TypedDict):
    """
    Represents the state of our graph.
    """
    repo_url: Optional[str]
    file_path: Optional[str]
    user_query: Optional[str]
    files_data: Dict[str, str]
    corpus: Any
    static_analysis: Any
    ai_analysis: Any
    answer: Optional[str]
    insights: List[str]
    current_node: str

class CodeMesherGraph:
    def __init__(self, groq_api_key: str):
        self.groq_api_key = groq_api_key
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            api_key=groq_api_key
        )
        self.workflow = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(GraphState)

        # Define the nodes
        workflow.add_node("router", self.router)
        workflow.add_node("scan-workspace", self.scan_workspace)
        workflow.add_node("build-corpus", self.build_corpus)
        workflow.add_node("ask-anything", self.ask_anything)
        workflow.add_node("analyze-file", self.analyze_file)
        workflow.add_node("ai-analysis", self.ai_analysis)
        workflow.add_node("export-insights", self.export_insights)

        # Define the edges
        workflow.set_entry_point("router")
        
        # Conditional mapping from router
        workflow.add_conditional_edges(
            "router",
            self.route_decision,
            {
                "scan": "scan-workspace",
                "corpus": "build-corpus",
                "ask": "ask-anything",
                "analyze": "analyze-file",
                "ai": "ai-analysis",
                "export": "export-insights",
                "end": END
            }
        )

        # Allow sequential execution or returning to end
        workflow.add_edge("scan-workspace", "build-corpus")
        workflow.add_edge("build-corpus", END)
        workflow.add_edge("analyze-file", "ai-analysis")
        workflow.add_edge("ai-analysis", END)
        workflow.add_edge("ask-anything", "export-insights")
        workflow.add_edge("export-insights", END)

        return workflow.compile()

    def router(self, state: GraphState) -> GraphState:
        print("---ROUTING---")
        user_query = state.get("user_query", "").lower()
        
        # If no query but there's a specific current_node requested from state
        target = state.get("current_node")
        if target and target != "router":
            return state

        prompt = f"""
        Analyze the user's intent and pick the most relevant tool:
        "scan" - if they want to scan, clone, or fetch the repository.
        "corpus" - if they want to build a search index or process code.
        "ask" - if they have a specific question about the code logic.
        "analyze" - if they want to check file metrics or complexity.
        "ai" - if they want deep architectural review or AI analysis.
        "export" - if they want to export insights or a summary.
        "end" - if the request is unclear or finished.

        User Prompt: "{user_query}"
        Tool: """
        
        res = self.llm.invoke(prompt)
        decision = res.content.strip().lower()
        
        # Mapping fuzzy response to exact keys
        found_tool = "end"
        for t in ["scan", "corpus", "ask", "analyze", "ai", "export"]:
            if t in decision:
                found_tool = t
                break
        
        return {**state, "current_node": found_tool}

    def route_decision(self, state: GraphState) -> str:
        return state.get("current_node", "end")

    def scan_workspace(self, state: GraphState) -> GraphState:
        print("---SCANNING WORKSPACE---")
        repo_url = state.get("repo_url")
        if not repo_url:
            return {**state, "current_node": "scan-workspace", "files_data": {}}
        
        # Use existing WikiPipeline to fetch files
        wiki_pipeline = WikiPipeline(github_token=os.getenv("GITHUB_TOKEN"))
        try:
            files_data, _ = wiki_pipeline.fetch_repo_files(repo_url)
            return {**state, "files_data": files_data, "current_node": "scan-workspace"}
        except Exception as e:
            print(f"Error scanning workspace: {e}")
            return {**state, "files_data": {}, "current_node": "scan-workspace"}

    def build_corpus(self, state: GraphState) -> GraphState:
        print("---BUILDING CORPUS---")
        files_data = state.get("files_data", {})
        if not files_data:
            return {**state, "current_node": "build-corpus"}
        
        # Initialize QueryAnalyzer which builds the TF-IDF corpus
        corpus = QueryAnalyzer(files_data)
        return {**state, "corpus": corpus, "current_node": "build-corpus"}

    def analyze_file(self, state: GraphState) -> GraphState:
        print("---ANALYZING FILE---")
        file_path = state.get("file_path")
        files_data = state.get("files_data", {})
        
        if not file_path or file_path not in files_data:
            # If no specific file requested, maybe analyze the largest one or skip
            if not files_data:
                return {**state, "current_node": "analyze-file"}
            file_path = list(files_data.keys())[0]

        code_content = files_data.get(file_path, "")
        analyzer = FileAnalyzer()
        static_analysis = analyzer.analyze_code_string(code_content)
        
        return {**state, "static_analysis": static_analysis, "current_node": "analyze-file"}

    def ai_analysis(self, state: GraphState) -> GraphState:
        print("---AI ANALYSIS---")
        static_analysis = state.get("static_analysis")
        files_data = state.get("files_data", {})
        file_path = state.get("file_path")
        
        if not static_analysis or not file_path:
            return {**state, "current_node": "ai-analysis"}

        code_content = files_data.get(file_path, "")
        analyzer = FileAnalyzer()
        llm_prompt = analyzer.generate_llm_prompt(static_analysis, file_content=code_content)
        
        # Call Groq directly using our LLM component
        res = self.llm.invoke(llm_prompt)
        ai_analysis_text = res.content
        
        return {**state, "ai_analysis": ai_analysis_text, "current_node": "ai-analysis"}

    def ask_anything(self, state: GraphState) -> GraphState:
        print("---ASK ANYTHING---")
        user_query = state.get("user_query")
        corpus = state.get("corpus")
        
        if not user_query or not corpus:
            return {**state, "current_node": "ask-anything", "answer": "No query or corpus available."}

        # Retrieve relevant files
        relevant_files = corpus.find_relevant_files(user_query, top_k=3)
        retriever = CodeRetriever(relevant_files)
        snippets = retriever.get_snippets(max_lines=100)
        
        context_text = ""
        for s in snippets:
            context_text += f"\n--- File: {s['file_path']} ---\n{s['code']}\n"

        prompt = f"""
        Answer the following question based on these code snippets:
        Question: {user_query}
        
        Snippets:
        {context_text}
        """
        
        res = self.llm.invoke(prompt)
        return {**state, "answer": res.content, "current_node": "ask-anything"}

    def export_insights(self, state: GraphState) -> GraphState:
        print("---EXPORTING INSIGHTS---")
        # Combine everything into a set of insights
        ai_analysis = state.get("ai_analysis", "")
        answer = state.get("answer", "")
        
        insights = []
        if ai_analysis:
            insights.append(f"AI File Analysis: {ai_analysis[:500]}...")
        if answer:
            insights.append(f"Query Answer: {answer[:500]}...")
        
        return {**state, "insights": insights, "current_node": "export-insights"}

    def run(self, repo_url: str, file_path: Optional[str] = None, user_query: Optional[str] = None, current_node: str = "router"):
        initial_state = {
            "repo_url": repo_url,
            "file_path": file_path,
            "user_query": user_query,
            "files_data": {},
            "corpus": None,
            "static_analysis": None,
            "ai_analysis": None,
            "answer": None,
            "insights": [],
            "current_node": current_node
        }
        return self.workflow.invoke(initial_state)
