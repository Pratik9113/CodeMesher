# pipeline/preprocessor.py
import re

class Preprocessor:
    def preprocess_query(self, query: str):
        query = query.strip().lower()
        query = re.sub(r'\W+', ' ', query)
        return query

    def preprocess_code(self, code: str):
        # Remove Python comments, docstrings, and excessive blank lines
        code = re.sub(r'"""[\s\S]*?"""', '', code)  # docstrings
        code = re.sub(r"#.*", "", code)  # single-line comments
        code = re.sub(r"\n\s*\n", "\n", code)  # multiple blank lines
        return code.strip()
