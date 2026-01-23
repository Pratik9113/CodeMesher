# pipeline/query_analysis.py
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class QueryAnalyzer:
    def __init__(self, file_contents: dict):
        """
        file_contents: dict {file_path: file_content}
        """
        # Filter out None values (binary/non-text files)
        self.file_contents = {k: self.clean_text(v) for k, v in file_contents.items() if v is not None}
        self.vectorizer = TfidfVectorizer()

    def clean_text(self, text: str):
        # simple cleanup for TF-IDF
        text = re.sub(r'\W+', ' ', text)
        return text

    def find_relevant_files(self, query: str, top_k=5):
        corpus = list(self.file_contents.values())
        file_paths = list(self.file_contents.keys())
        vectors = self.vectorizer.fit_transform(corpus)
        query_vec = self.vectorizer.transform([query])
        sim_scores = cosine_similarity(query_vec, vectors).flatten()
        top_indices = sim_scores.argsort()[-top_k:][::-1]
        return [(file_paths[i], self.file_contents[file_paths[i]]) for i in top_indices]
