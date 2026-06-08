import os
import subprocess
import sys

def get_git_author():
    try:
        author = subprocess.check_output(["git", "config", "user.name"], text=True).strip()
        return author
    except Exception:
        return None

def count_local_lines():
    print("--- LOCAL CODEBASE METRICS (Current Files) ---")
    py_files, py_lines = 0, 0
    js_files, js_lines = 0, 0
    
    exclude_dirs = {'.git', 'node_modules', 'venv', 'env', '.gemini', 'dist', 'build', '__pycache__'}
    py_extensions = {'.py'}
    js_extensions = {'.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css'}
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            file_path = os.path.join(root, file)
            if ext in py_extensions:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len([line for line in f if line.strip()])
                        py_files += 1
                        py_lines += lines
                except Exception:
                    pass
            elif ext in js_extensions:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len([line for line in f if line.strip()])
                        js_files += 1
                        js_lines += lines
                except Exception:
                    pass
                    
    print(f"Python: {py_files} files, {py_lines} non-empty lines")
    print(f"JS/TS/Web: {js_files} files, {js_lines} non-empty lines\n")

def count_git_contribution(author):
    if not author:
        print("Could not retrieve Git author. Skipping Git history metrics.")
        return
        
    print(f"--- GIT CONTRIBUTION METRICS (Author: {author}) ---")
    try:
        # Run git log --numstat for the author
        cmd = ["git", "log", f"--author={author}", "--numstat", "--pretty=format:"]
        output = subprocess.check_output(cmd, text=True)
        
        py_inserted, py_deleted = 0, 0
        js_inserted, js_deleted = 0, 0
        
        py_extensions = {'.py'}
        js_extensions = {'.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css'}
        
        for line in output.splitlines():
            if not line.strip():
                continue
            parts = line.split('\t')
            if len(parts) == 3:
                added, deleted, filename = parts
                if added.isdigit() and deleted.isdigit():
                    added = int(added)
                    deleted = int(deleted)
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in py_extensions:
                        py_inserted += added
                        py_deleted += deleted
                    elif ext in js_extensions:
                        js_inserted += added
                        js_deleted += deleted
                        
        print("Python:")
        print(f"  Lines Inserted: {py_inserted}")
        print(f"  Lines Deleted:  {py_deleted}")
        print(f"  Net Lines:      {py_inserted - py_deleted}")
        print("JS/TS/Web:")
        print(f"  Lines Inserted: {js_inserted}")
        print(f"  Lines Deleted:  {js_deleted}")
        print(f"  Net Lines:      {js_inserted - js_deleted}\n")
    except Exception as e:
        print(f"Error reading Git history: {e}")

if __name__ == "__main__":
    count_local_lines()
    author = get_git_author()
    count_git_contribution(author)
