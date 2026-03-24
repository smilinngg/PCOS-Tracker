import os
import glob
import re

directory = 'c:/Users/asus/OneDrive/Desktop/PCOS prediction/pcos-frontend'
files = glob.glob(f'{directory}/**/*.tsx', recursive=True)
files += glob.glob(f'{directory}/**/*.js', recursive=True)

for filepath in files:
    # Skip node_modules or .next if any
    if 'node_modules' in filepath or '.next' in filepath:
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change color palettes:
    # indigo -> rose, fuchsia -> pink, emerald -> teal
    new_content = content.replace('indigo', 'rose').replace('fuchsia', 'pink').replace('emerald', 'teal')

    # Change slate to stone for a warmer grey tone matching pink/rose better
    new_content = new_content.replace('slate-', 'stone-')

    # Specific grid and layout replacements
    if 'page.tsx' in filepath and 'pcos-frontend\\app\\page.tsx' in filepath:
        new_content = new_content.replace('grid sm:grid-cols-3 gap-6', 'grid grid-cols-1 md:grid-cols-3 gap-10')
        new_content = new_content.replace('max-w-3xl text-center', 'max-w-4xl text-center')

    if 'dashboard\\page.tsx' in filepath:
        new_content = new_content.replace('grid grid-cols-1 md:grid-cols-3 gap-4', 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8')
        new_content = new_content.replace('max-w-4xl mx-auto', 'max-w-6xl mx-auto')

    if 'assessment\\page.tsx' in filepath:
        # Before: lg:col-span-3 and lg:col-span-2
        new_content = new_content.replace('lg:col-span-3', 'xl:col-span-3 lg:col-span-5')
        new_content = new_content.replace('lg:col-span-2', 'xl:col-span-2 lg:col-span-5')
        new_content = new_content.replace('max-w-7xl mx-auto', 'max-w-[1400px] mx-auto px-4')
        new_content = new_content.replace('grid lg:grid-cols-5 gap-8', 'grid xl:grid-cols-5 lg:grid-cols-1 gap-12')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated UI for {filepath}")
