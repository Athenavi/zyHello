"""Scan templates for Jinja2 variable references."""
import re
import os

vars_set = set()
for root, dirs, files in os.walk('app/templates'):
    for f in files:
        if f.endswith('.html'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            # Find all Jinja2 expression blocks {{ ... }}
            for m in re.findall(r'\{\{(.*?)\}\}', content, re.DOTALL):
                for tok in re.findall(r'(\b\w+(?:\.\w+)*\b)', m):
                    if tok not in ('if', 'else', 'elif', 'not', 'and', 'or', 'in', 'is', 'none', 'true', 'false'):
                        vars_set.add(tok)
            # Also check for {%- include -%} patterns
            for m in re.findall(r'\{%-?\s*include\s+"([^"]+)"', content):
                print(f'INCLUDE: {m}')

for v in sorted(vars_set):
    print(f'VAR: {v}')
