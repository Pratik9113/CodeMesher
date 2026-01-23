# pipeline/code_graph.py
import ast

class CodeGraph:
    def __init__(self, code: str):
        self.code = code

    def build_graph(self):
        """
        Returns a dictionary where keys are function names
        and values are list of functions called within that function.
        """
        graph = {}
        try:
            tree = ast.parse(self.code)
        except SyntaxError:
            return {}  # skip invalid code

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                calls = []
                for n in ast.walk(node):
                    if isinstance(n, ast.Call):
                        if hasattr(n.func, 'id'):
                            calls.append(n.func.id)
                        elif hasattr(n.func, 'attr'):
                            calls.append(n.func.attr)
                graph[node.name] = calls
        return graph
