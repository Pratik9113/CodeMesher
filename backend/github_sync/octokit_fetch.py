# github_sync/octokit_fetch.py
from github import Github
import base64

class GitHubFetcher:
    def __init__(self, token: str, repo_name: str):
        self.g = Github(token)
        self.repo = self.g.get_repo(repo_name)

    def get_all_files(self, extensions=None):
        """
        Fetch all file paths in repo recursively.
        Optionally filter by extensions (e.g., ['.py', '.js']).
        """
        files = []
        contents = self.repo.get_contents("")
        while contents:
            file_content = contents.pop(0)
            if file_content.type == "dir":
                contents.extend(self.repo.get_contents(file_content.path))
            else:
                if extensions:
                    if any(file_content.path.endswith(ext) for ext in extensions):
                        files.append(file_content.path)
                else:
                    files.append(file_content.path)
        return files

    def get_file_content(self, path: str):
        """
        Return file content as string.
        Skip binary/non-UTF-8 files safely.
        """
        file_content = self.repo.get_contents(path)
        try:
            decoded = base64.b64decode(file_content.content)
            return decoded.decode('utf-8')
        except UnicodeDecodeError:
            print(f"[Warning] Skipping non-text/binary file: {path}")
            return None

    def update_file(self, path: str, new_content: str, commit_message: str):
        """Update file in repo"""
        file_content = self.repo.get_contents(path)
        self.repo.update_file(path, commit_message, new_content, file_content.sha)
        return f"Updated {path}"


# Example usage:
# fetcher = GitHubFetcher("TOKEN", "username/repo")
# all_files = fetcher.get_all_files(extensions=['.py'])  # only Python files
# for f in all_files:
#     content = fetcher.get_file_content(f)
#     if content:  # skip binary
#         print(f[:100])
# fetcher.update_file("script.py", "print('updated')", "Updated script")
