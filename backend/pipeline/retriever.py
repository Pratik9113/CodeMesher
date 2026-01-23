# pipeline/retriever.py
class CodeRetriever:
    def __init__(self, relevant_files):
        """
        relevant_files: list of tuples [(file_path, code)]
        """
        self.relevant_files = relevant_files

    def get_snippets(self, max_lines=300):
        """
        Splits files into manageable snippets for LLM processing
        """
        snippets = []
        for path, code in self.relevant_files:
            lines = code.splitlines()
            for i in range(0, len(lines), max_lines):
                snippet = "\n".join(lines[i:i+max_lines])
                snippets.append({"file_path": path, "code": snippet})
        return snippets
