# pipeline/file_analyzer.py
import os
import re
import json
import ast
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path

class FileAnalyzer:
    def __init__(self, root_path: str):
        self.root_path = root_path
        self.dependencies = {}
        self.file_insights = {}

    def generate_llm_prompt(self, analysis):
        # Generate a prompt for LLM from the analysis
        return f"Analyze this code: {analysis.get('summary', '')}"
        
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Comprehensive analysis of any file and its dependencies
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {"error": f"Could not read file: {str(e)}"}
            
        file_extension = os.path.splitext(file_path)[1].lower()
        
        analysis = {
            "file_path": file_path,
            "file_extension": file_extension,
            "file_content": content,
            "dependencies": self._extract_dependencies(content, file_path),
            "exports": self._extract_exports(content, file_extension),
            "imports": self._extract_imports(content, file_extension),
            "functions": self._extract_functions(content, file_extension),
            "classes": self._extract_classes(content, file_extension),
            "file_insights": self._generate_file_insights(content, file_path),
            "code_structure": self._analyze_code_structure(content, file_extension),
            "related_files": self._find_related_files(file_path)
        }
        
        return analysis
    
    def analyze_code_string(self, code_content):
        # Implement your code analysis logic here
        # Return a dict, e.g. {"summary": "..."}
        return {"summary": "valid code"}  # Sample output


    def _extract_dependencies(self, content: str, file_path: str) -> Dict[str, Any]:
        """Extract all dependencies from the file"""
        dependencies = {
            "imports": [],
            "requires": [],
            "dynamic_imports": [],
            "package_dependencies": []
        }
        
        # Extract ES6 imports
        import_pattern = r'import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+[\'"]([^\'"]+)[\'"]'
        imports = re.findall(import_pattern, content)
        dependencies["imports"] = imports
        
        # Extract require statements
        require_pattern = r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        requires = re.findall(require_pattern, content)
        dependencies["requires"] = requires
        
        # Extract dynamic imports
        dynamic_pattern = r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        dynamic_imports = re.findall(dynamic_pattern, content)
        dependencies["dynamic_imports"] = dynamic_imports
        
        # Check package.json for dependencies
        package_json_path = self._find_package_json(file_path)
        if package_json_path:
            dependencies["package_dependencies"] = self._extract_package_dependencies(package_json_path)
        
        return dependencies
    
    def _extract_exports(self, content: str, file_extension: str) -> List[Dict[str, str]]:
        """Extract all export statements based on file type"""
        exports = []
        
        if file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            # Named exports
            named_pattern = r'export\s+(?:const|let|var|function|class)\s+(\w+)'
            named_exports = re.findall(named_pattern, content)
            for export in named_exports:
                exports.append({"type": "named", "name": export})
            
            # Default exports
            default_pattern = r'export\s+default\s+(\w+)'
            default_exports = re.findall(default_pattern, content)
            for export in default_exports:
                exports.append({"type": "default", "name": export})
            
            # Export statements
            export_pattern = r'export\s*{\s*([^}]+)\s*}'
            export_blocks = re.findall(export_pattern, content)
            for block in export_blocks:
                items = [item.strip() for item in block.split(',')]
                for item in items:
                    if 'as' in item:
                        name, alias = item.split('as')
                        exports.append({"type": "named", "name": name.strip(), "alias": alias.strip()})
                    else:
                        exports.append({"type": "named", "name": item})
        
        elif file_extension == '.py':
            # Python exports (functions, classes, variables)
            func_pattern = r'^def\s+(\w+)'
            class_pattern = r'^class\s+(\w+)'
            var_pattern = r'^(\w+)\s*='
            
            for pattern, export_type in [(func_pattern, "function"), (class_pattern, "class"), (var_pattern, "variable")]:
                matches = re.findall(pattern, content, re.MULTILINE)
                for match in matches:
                    exports.append({"type": export_type, "name": match})
        
        return exports
    
    def _extract_imports(self, content: str, file_extension: str) -> List[Dict[str, str]]:
        """Extract all import statements with details based on file type"""
        imports = []
        
        if file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            # ES6 imports
            import_pattern = r'import\s+(?:{([^}]*)}|\* as (\w+)|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"]'
            matches = re.finditer(import_pattern, content)
            
            for match in matches:
                named_imports = match.group(1)
                namespace_import = match.group(2)
                default_import = match.group(3)
                source = match.group(4)
                
                if named_imports:
                    items = [item.strip() for item in named_imports.split(',')]
                    for item in items:
                        if 'as' in item:
                            name, alias = item.split('as')
                            imports.append({
                                "type": "named",
                                "name": name.strip(),
                                "alias": alias.strip(),
                                "source": source
                            })
                        else:
                            imports.append({
                                "type": "named",
                                "name": item,
                                "source": source
                            })
                elif namespace_import:
                    imports.append({
                        "type": "namespace",
                        "name": namespace_import,
                        "source": source
                    })
                elif default_import:
                    imports.append({
                        "type": "default",
                        "name": default_import,
                        "source": source
                    })
        
        elif file_extension == '.py':
            # Python imports
            import_patterns = [
                r'^import\s+(\w+)',
                r'^from\s+(\w+)\s+import\s+([^#\n]+)',
                r'^import\s+(\w+)\s+as\s+(\w+)'
            ]
            
            for pattern in import_patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    if 'from' in pattern:
                        module = match.group(1)
                        items = match.group(2).split(',')
                        for item in items:
                            item = item.strip()
                            if 'as' in item:
                                name, alias = item.split('as')
                                imports.append({
                                    "type": "from_import",
                                    "name": name.strip(),
                                    "alias": alias.strip(),
                                    "source": module
                                })
                            else:
                                imports.append({
                                    "type": "from_import",
                                    "name": item,
                                    "source": module
                                })
                    elif 'as' in pattern:
                        imports.append({
                            "type": "import_as",
                            "name": match.group(1),
                            "alias": match.group(2),
                            "source": match.group(1)
                        })
                    else:
                        imports.append({
                            "type": "import",
                            "name": match.group(1),
                            "source": match.group(1)
                        })
        
        return imports
    
    def _extract_functions(self, content: str, file_extension: str) -> List[Dict[str, Any]]:
        """Extract function definitions based on file type"""
        functions = []
        
        if file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            # Function declarations
            func_pattern = r'function\s+(\w+)\s*\([^)]*\)\s*{'
            func_matches = re.finditer(func_pattern, content)
            
            for match in func_matches:
                functions.append({
                    "name": match.group(1),
                    "type": "declaration",
                    "line": content[:match.start()].count('\n') + 1
                })
            
            # Arrow functions
            arrow_pattern = r'(\w+)\s*=\s*\([^)]*\)\s*=>'
            arrow_matches = re.finditer(arrow_pattern, content)
            
            for match in arrow_matches:
                functions.append({
                    "name": match.group(1),
                    "type": "arrow",
                    "line": content[:match.start()].count('\n') + 1
                })
            
            # Method definitions
            method_pattern = r'(\w+)\s*\([^)]*\)\s*{'
            method_matches = re.finditer(method_pattern, content)
            
            for match in method_matches:
                # Check if it's inside a class
                before_match = content[:match.start()]
                if 'class' in before_match and '{' in before_match:
                    functions.append({
                        "name": match.group(1),
                        "type": "method",
                        "line": content[:match.start()].count('\n') + 1
                    })
        
        elif file_extension == '.py':
            # Python functions
            func_pattern = r'^def\s+(\w+)\s*\([^)]*\):'
            func_matches = re.finditer(func_pattern, content, re.MULTILINE)
            
            for match in func_matches:
                functions.append({
                    "name": match.group(1),
                    "type": "function",
                    "line": content[:match.start()].count('\n') + 1
                })
            
            # Lambda functions
            lambda_pattern = r'(\w+)\s*=\s*lambda\s+[^:]+:'
            lambda_matches = re.finditer(lambda_pattern, content)
            
            for match in lambda_matches:
                functions.append({
                    "name": match.group(1),
                    "type": "lambda",
                    "line": content[:match.start()].count('\n') + 1
                })
        
        return functions
    
    def _extract_classes(self, content: str, file_extension: str) -> List[Dict[str, Any]]:
        """Extract class definitions based on file type"""
        classes = []
        
        if file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            class_pattern = r'class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{'
            matches = re.finditer(class_pattern, content)
            
            for match in matches:
                classes.append({
                    "name": match.group(1),
                    "extends": match.group(2) if match.group(2) else None,
                    "line": content[:match.start()].count('\n') + 1
                })
        
        elif file_extension == '.py':
            class_pattern = r'^class\s+(\w+)(?:\s*\([^)]*\))?:'
            matches = re.finditer(class_pattern, content, re.MULTILINE)
            
            for match in matches:
                classes.append({
                    "name": match.group(1),
                    "extends": None,  # Python inheritance would need more complex parsing
                    "line": content[:match.start()].count('\n') + 1
                })
        
        return classes
    
    def _analyze_code_structure(self, content: str, file_extension: str) -> Dict[str, Any]:
        """Analyze the overall structure of the code based on file type"""
        lines = content.split('\n')
        
        base_structure = {
            "total_lines": len(lines),
            "non_empty_lines": len([line for line in lines if line.strip()]),
            "complexity_score": self._calculate_complexity(content),
        }
        
        if file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            base_structure.update({
                "comment_lines": len([line for line in lines if line.strip().startswith('//') or line.strip().startswith('/*')]),
                "has_async_functions": 'async' in content,
                "has_promises": 'Promise' in content or '.then(' in content,
                "has_react_components": 'React' in content or 'jsx' in content.lower(),
                "has_express_routes": 'app.get(' in content or 'app.post(' in content or 'router.' in content,
                "has_es6_features": 'const ' in content or 'let ' in content or '=>' in content,
                "has_modules": 'import ' in content or 'export ' in content
            })
        elif file_extension == '.py':
            base_structure.update({
                "comment_lines": len([line for line in lines if line.strip().startswith('#')]),
                "has_async_functions": 'async def' in content,
                "has_classes": 'class ' in content,
                "has_imports": 'import ' in content or 'from ' in content,
                "has_decorators": '@' in content,
                "has_lambda": 'lambda ' in content,
                "has_list_comprehensions": '[' in content and 'for ' in content and 'in ' in content
            })
        else:
            base_structure.update({
                "comment_lines": len([line for line in lines if line.strip().startswith('#') or line.strip().startswith('//')]),
                "has_functions": 'function ' in content or 'def ' in content,
                "has_classes": 'class ' in content,
                "has_imports": 'import ' in content or 'require(' in content
            })
        
        return base_structure
    
    def _calculate_complexity(self, content: str) -> int:
        """Simple complexity calculation based on control structures"""
        complexity_keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try']
        complexity = 1  # Base complexity
        
        for keyword in complexity_keywords:
            complexity += content.count(keyword)
        
        return complexity
    
    def _generate_file_insights(self, content: str, file_path: str) -> Dict[str, Any]:
        """Generate insights about the file"""
        insights = {
            "file_type": self._detect_file_type(content, file_path),
            "framework": self._detect_framework(content),
            "patterns_used": self._detect_patterns(content),
            "potential_issues": self._detect_issues(content),
            "suggestions": self._generate_suggestions(content, file_path)
        }
        
        return insights
    
    def _detect_file_type(self, content: str, file_path: str) -> str:
        """Detect the type of file based on content and extension"""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension in ['.js', '.jsx']:
            if 'React' in content or 'jsx' in content.lower():
                return "React Component"
            elif 'express' in content.lower() or 'app.get(' in content:
                return "Express Server"
            elif 'module.exports' in content or 'require(' in content:
                return "Node.js Module"
            elif 'export' in content and 'import' in content:
                return "ES6 Module"
            else:
                return "JavaScript File"
        elif file_extension in ['.ts', '.tsx']:
            if 'React' in content or 'jsx' in content.lower():
                return "React TypeScript Component"
            elif 'express' in content.lower() or 'app.get(' in content:
                return "Express TypeScript Server"
            else:
                return "TypeScript File"
        elif file_extension == '.py':
            if 'Flask' in content or 'app = Flask' in content:
                return "Flask Application"
            elif 'Django' in content or 'from django' in content:
                return "Django Application"
            elif 'class ' in content and 'def ' in content:
                return "Python Class Module"
            elif 'def ' in content:
                return "Python Function Module"
            else:
                return "Python Script"
        elif file_extension == '.html':
            return "HTML File"
        elif file_extension == '.css':
            return "CSS Stylesheet"
        elif file_extension == '.json':
            return "JSON Configuration"
        else:
            return f"{file_extension.upper()} File"
    
    def _detect_framework(self, content: str) -> str:
        """Detect the framework being used"""
        if 'React' in content:
            return "React"
        elif 'Vue' in content:
            return "Vue"
        elif 'Angular' in content:
            return "Angular"
        elif 'express' in content.lower():
            return "Express"
        elif 'next' in content.lower():
            return "Next.js"
        else:
            return "Vanilla JavaScript"
    
    def _detect_patterns(self, content: str) -> List[str]:
        """Detect common patterns in the code"""
        patterns = []
        
        if 'useState' in content or 'useEffect' in content:
            patterns.append("React Hooks")
        if 'async' in content and 'await' in content:
            patterns.append("Async/Await")
        if 'Promise' in content:
            patterns.append("Promises")
        if 'class' in content:
            patterns.append("ES6 Classes")
        if '=>' in content:
            patterns.append("Arrow Functions")
        if 'const' in content and 'let' in content:
            patterns.append("ES6 Variables")
        
        return patterns
    
    def _detect_issues(self, content: str) -> List[str]:
        """Detect potential issues in the code"""
        issues = []
        
        if 'var ' in content:
            issues.append("Using var instead of let/const")
        if 'console.log' in content:
            issues.append("Console.log statements present")
        if 'eval(' in content:
            issues.append("Use of eval() - security risk")
        if 'innerHTML' in content:
            issues.append("Direct innerHTML usage - potential XSS risk")
        
        return issues
    
    def _generate_suggestions(self, content: str, file_path: str) -> List[str]:
        """Generate improvement suggestions"""
        suggestions = []
        
        if not content.strip().startswith('//') and not content.strip().startswith('/*'):
            suggestions.append("Add file header comment")
        
        if 'function' in content and 'arrow' not in content:
            suggestions.append("Consider using arrow functions for consistency")
        
        if 'var ' in content:
            suggestions.append("Replace var with let/const for better scoping")
        
        if 'console.log' in content:
            suggestions.append("Remove or replace console.log with proper logging")
        
        return suggestions
    
    def _find_related_files(self, index_path: str) -> List[str]:
        """Find files related to this index file"""
        related_files = []
        index_dir = os.path.dirname(index_path)
        
        # Look for common related files
        common_files = [
            'package.json',
            'README.md',
            'config.js',
            'config.json',
            'webpack.config.js',
            'vite.config.js',
            'tsconfig.json',
            '.env',
            '.env.local'
        ]
        
        for file in common_files:
            file_path = os.path.join(index_dir, file)
            if os.path.exists(file_path):
                related_files.append(file_path)
        
        # Look for other JS/TS files in the same directory
        for file in os.listdir(index_dir):
            if file.endswith(('.js', '.ts', '.jsx', '.tsx')) and file != os.path.basename(index_path):
                related_files.append(os.path.join(index_dir, file))
        
        return related_files
    
    def _find_package_json(self, file_path: str) -> Optional[str]:
        """Find package.json file starting from the given path"""
        current_dir = os.path.dirname(file_path)
        
        while current_dir != os.path.dirname(current_dir):  # Not at root
            package_path = os.path.join(current_dir, 'package.json')
            if os.path.exists(package_path):
                return package_path
            current_dir = os.path.dirname(current_dir)
        
        return None
    
    def _extract_package_dependencies(self, package_json_path: str) -> Dict[str, Any]:
        """Extract dependencies from package.json"""
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            return {
                "dependencies": package_data.get("dependencies", {}),
                "devDependencies": package_data.get("devDependencies", {}),
                "scripts": package_data.get("scripts", {}),
                "name": package_data.get("name", ""),
                "version": package_data.get("version", "")
            }
        except Exception as e:
            return {"error": f"Could not parse package.json: {str(e)}"}
    
#     def generate_llm_prompt(self, analysis: Dict[str, Any]) -> str:
#         """Generate a comprehensive prompt for LLM analysis"""
#         file_extension = analysis.get('file_extension', '')
#         language = self._get_language_name(file_extension)
        
#         prompt = f"""
# # {os.path.basename(analysis['file_path'])} File Analysis

# ## File Information
# - **File Path**: {analysis['file_path']}
# - **File Type**: {analysis['file_insights']['file_type']}
# - **Framework**: {analysis['file_insights']['framework']}
# - **Language**: {language}
# - **Total Lines**: {analysis['code_structure']['total_lines']}
# - **Complexity Score**: {analysis['code_structure']['complexity_score']}

# ## Code Structure
# - **Functions**: {len(analysis['functions'])} functions found
# - **Classes**: {len(analysis['classes'])} classes found
# - **Exports**: {len(analysis['exports'])} export statements
# - **Imports**: {len(analysis['imports'])} import statements

# ## Dependencies
# - **Imports**: {', '.join(analysis['dependencies']['imports']) if analysis['dependencies']['imports'] else 'None'}
# - **Require Statements**: {', '.join(analysis['dependencies']['requires']) if analysis['dependencies']['requires'] else 'None'}
# - **Dynamic Imports**: {', '.join(analysis['dependencies']['dynamic_imports']) if analysis['dependencies']['dynamic_imports'] else 'None'}

# ## Patterns Detected
# {', '.join(analysis['file_insights']['patterns_used']) if analysis['file_insights']['patterns_used'] else 'No specific patterns detected'}

# ## Potential Issues
# {', '.join(analysis['file_insights']['potential_issues']) if analysis['file_insights']['potential_issues'] else 'No issues detected'}

# ## Code Content
# ```{language.lower()}
# {analysis['file_content']}
# ```

# ## Related Files
# {', '.join(analysis['related_files']) if analysis['related_files'] else 'No related files found'}

# Please provide a comprehensive analysis of this {os.path.basename(analysis['file_path'])} file, including:
# 1. **Purpose and Functionality**: What does this file do?
# 2. **Architecture**: How is the code structured?
# 3. **Dependencies**: What external libraries/modules does it depend on?
# 4. **Code Quality**: Assessment of code quality and best practices
# 5. **Improvements**: Specific suggestions for improvement
# 6. **Security**: Any security considerations
# 7. **Performance**: Performance implications and optimizations
# 8. **Maintainability**: How maintainable is this code?
# 9. **Best Practices**: Language-specific best practices and conventions
# 10. **File Organization**: How this file fits into the larger project structure

# Provide detailed explanations and actionable insights.
# """
#         return prompt
    
    def _get_language_name(self, file_extension: str) -> str:
        """Get the language name from file extension"""
        language_map = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.py': 'Python',
            '.html': 'HTML',
            '.css': 'CSS',
            '.json': 'JSON',
            '.md': 'Markdown',
            '.txt': 'Text',
            '.xml': 'XML',
            '.yaml': 'YAML',
            '.yml': 'YAML'
        }
        return language_map.get(file_extension, 'Unknown')