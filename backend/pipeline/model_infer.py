# pipeline/model_infer.py
from difflib import unified_diff

class ModelInfer:
    def enhance_code(self, code_snippet: str, query: str):
        """
        Enhances code based on query:
        - Adds TODO comments if query mentions features
        - Simple regex-based code improvement
        (replace this with LLM for real AI enhancement)
        """
        enhanced_code = code_snippet

        # Example: if query mentions 'logging', ensure logging import exists
        if "logging" in query.lower() and "import logging" not in enhanced_code:
            enhanced_code = "import logging\n" + enhanced_code

        # Add a comment about enhancement
        enhanced_code = f"# Enhancement based on query: {query}\n" + enhanced_code

        return enhanced_code

    def diff_code(self, old_code, new_code):
        """
        Returns unified diff of old vs enhanced code
        """
        diff = "\n".join(unified_diff(old_code.splitlines(),
                                      new_code.splitlines(),
                                      lineterm=''))
        return diff
