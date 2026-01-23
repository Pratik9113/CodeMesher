# pipeline/postprocessor.py
class PostProcessor:
    def finalize_code(self, code: str):
        # Clean trailing spaces and ensure newline at end
        code = "\n".join([line.rstrip() for line in code.splitlines()])
        if not code.endswith("\n"):
            code += "\n"
        return code
