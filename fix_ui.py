import os
import glob
import re

directory = 'c:/Users/asus/OneDrive/Desktop/PCOS prediction/pcos-frontend'
files = glob.glob(f'{directory}/**/*.tsx', recursive=True)
files += glob.glob(f'{directory}/**/*.js', recursive=True)

for filepath in files:
    if 'node_modules' in filepath or '.next' in filepath:
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace('transtone-', 'translate-')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed translate- syntax in {filepath}")
