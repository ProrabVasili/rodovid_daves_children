#!/usr/bin/env python3
"""
Швидкий тест проекту перед подачею
"""

import sys
import os

print("=" * 60)
print("🧪 ТЕСТ ПРОЕКТУ РОДОВІД")
print("=" * 60)
print()

errors = []
warnings = []

# 1. Перевірка структури
print("[1/5] 📁 Перевірка структури файлів...")
required_files = [
    'backend/main.py',
    'backend/rag_engine.py',
    'backend/requirements.txt',
    'frontend/index.html',
    'frontend/app.js',
    'data/archives.json',
    'README.md'
]

for file in required_files:
    if os.path.exists(file):
        print(f"  ✅ {file}")
    else:
        print(f"  ❌ {file} - ВІДСУТНІЙ!")
        errors.append(f"Файл {file} не знайдено")

print()

# 2. Перевірка Python залежностей
print("[2/5] 🐍 Перевірка Python залежностей...")
required_packages = [
    'fastapi',
    'uvicorn',
    'sentence_transformers'
]

for package in required_packages:
    try:
        __import__(package.replace('-', '_'))
        print(f"  ✅ {package}")
    except ImportError:
        print(f"  ⚠️  {package} - не встановлено")
        warnings.append(f"Пакет {package} не встановлено. Виконайте: pip install {package}")

print()

# 3. Перевірка даних
print("[3/5] 📊 Перевірка даних...")
try:
    import json
    with open('data/archives.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        count = len(data.get('archives', []))
        print(f"  ✅ Знайдено {count} архівних записів")
        if count < 5:
            warnings.append(f"Мало архівних записів ({count}). Рекомендовано >10")
except Exception as e:
    print(f"  ❌ Помилка читання archives.json: {e}")
    errors.append("Не вдалось прочитати архівні дані")

print()

# 4. Перевірка кодової бази
print("[4/5] 🔍 Перевірка кодової бази...")
try:
    with open('backend/main.py', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'RAGEngine' in content:
            print("  ✅ RAG Engine інтегрований")
        if 'CORS' in content:
            print("  ✅ CORS налаштовано")
        if '@app.post' in content:
            print("  ✅ API endpoints присутні")
except Exception as e:
    print(f"  ❌ Помилка перевірки main.py: {e}")
    errors.append("Проблема з backend кодом")

print()

# 5. Фінальний звіт
print("[5/5] 📋 Фінальний звіт")
print("=" * 60)

if errors:
    print("\n❌ КРИТИЧНІ ПОМИЛКИ:")
    for error in errors:
        print(f"  • {error}")
    print("\n⚠️  ПРОЕКТ НЕ ГОТОВИЙ ДО ПОДАЧІ!")
    sys.exit(1)

if warnings:
    print("\n⚠️  ПОПЕРЕДЖЕННЯ:")
    for warning in warnings:
        print(f"  • {warning}")

if not errors and not warnings:
    print("\n✅ ВСЕ ІДЕАЛЬНО!")
else:
    print("\n⚠️  Є попередження, але проект можна подавати")

print("\n" + "=" * 60)
print("🚀 НАСТУПНІ КРОКИ:")
print("=" * 60)
print("1. Запустити проект: START.bat (Windows) або ./START.sh (Linux)")
print("2. Перевірити http://localhost:8080")
print("3. Завантажити на GitHub")
print("4. Записати демо відео")
print("5. Заповнити Google Form")
print()
print("💪 Успіхів! 🇺🇦")
