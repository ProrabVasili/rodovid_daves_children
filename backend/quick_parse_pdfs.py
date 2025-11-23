#!/usr/bin/env python3
"""
ШВИДКИЙ ПАРСИНГ PDF для розширення бази архівів
Запускати: python quick_parse_pdfs.py
"""

import PyPDF2
import json
import re
from datetime import datetime

def extract_text_from_pdf(pdf_path):
    """Витягує текст з PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages[:10]:  # Перші 10 сторінок для швидкості
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Помилка читання {pdf_path}: {e}")
        return ""

def parse_rehabilitation_record(text, page_num=1):
    """Парсить запис про реабілітованого"""
    records = []
    
    # Прості паттерни для швидкого парсингу
    patterns = {
        'name': r'([А-ЯҐЄІЇ][а-яґєії]+\s+[А-ЯҐЄІЇ][а-яґєії]+\s+[А-ЯҐЄІЇ][а-яґєії]+)',
        'year': r'(\d{4})\s*р',
        'location': r'(?:с\.|м\.|смт\.)\s*([А-ЯҐЄІЇ][а-яґєії\-]+)',
        'occupation': r'(колгоспник|селянин|робітник|вчитель|лікар|бухгалтер|тракторист)'
    }
    
    # Розбиваємо на блоки по абзацах
    blocks = text.split('\n\n')
    
    for i, block in enumerate(blocks[:20]):  # Обмежуємо для швидкості
        if len(block) < 50:
            continue
            
        record = {
            "id": f"rehab_{page_num}_{i}",
            "type": "rehabilitation_record",
            "year": 1938,  # Default для репресій
            "location": "Київська область",
            "title": f"Реабілітований запис №{page_num}-{i}",
            "content": block[:500],  # Обмежуємо довжину
            "metadata": {
                "surnames": [],
                "given_names": [],
                "occupations": [],
                "location_variants": []
            }
        }
        
        # Шукаємо імена
        names = re.findall(patterns['name'], block)
        if names:
            for name in names[:3]:  # Максимум 3 імені
                parts = name.split()
                if len(parts) >= 2:
                    record["metadata"]["surnames"].append(parts[0])
                    record["metadata"]["given_names"].append(parts[1])
        
        # Шукаємо роки
        years = re.findall(patterns['year'], block)
        if years:
            record["year"] = int(years[0])
        
        # Шукаємо локації
        locations = re.findall(patterns['location'], block)
        if locations:
            record["location"] = locations[0]
            record["metadata"]["location_variants"] = locations
        
        # Шукаємо професії
        occupations = re.findall(patterns['occupation'], block.lower())
        if occupations:
            record["metadata"]["occupations"] = list(set(occupations))
        
        if record["metadata"]["surnames"]:  # Додаємо тільки якщо знайшли прізвища
            records.append(record)
    
    return records

def main():
    print("🚀 ШВИДКИЙ ПАРСИНГ PDF ДЛЯ ХАКАТОНУ")
    print("="*50)
    
    # Завантажуємо існуючі архіви
    try:
        with open('archives.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            archives = data['archives']
    except:
        archives = []
    
    print(f"📚 Існуючі архіви: {len(archives)} записів")
    
    # PDF файли для парсингу
    pdf_files = [
        'Kuivsk_kn_2_pdf_pdf.pdf',
        'Kuivsk_kn_3_s_1-797.pdf',
        'Kuivsk_kn_3_s_798-984.pdf'
    ]
    
    new_records = []
    
    for pdf_file in pdf_files:
        print(f"\n📄 Обробляю: {pdf_file}")
        
        text = extract_text_from_pdf(pdf_file)
        if not text:
            print(f"   ⚠️ Не вдалось прочитати")
            continue
            
        print(f"   ✅ Витягнуто {len(text)} символів")
        
        # Парсимо записи
        records = parse_rehabilitation_record(text, len(archives) + len(new_records))
        print(f"   📝 Знайдено {len(records)} записів")
        
        new_records.extend(records)
    
    # Додаємо штучні записи для демо (щоб точно було що знайти)
    demo_records = [
        {
            "id": "demo_001",
            "type": "rehabilitation_record",
            "year": 1937,
            "location": "м. Київ",
            "title": "Справа №12345 - Коваленко Петро Іванович",
            "content": "Коваленко Петро Іванович, 1895 р.н., уродженець с. Борщагівка Київської області, українець, освіта середня, безпартійний. До арешту працював головним лікарем Київської міської лікарні №3. Заарештований 15 листопада 1937 року за звинуваченням в антирадянській агітації. Розстріляний 3 грудня 1937 року. Реабілітований 12 травня 1956 року.",
            "metadata": {
                "surnames": ["Коваленко"],
                "given_names": ["Петро", "Іванович"],
                "father": "Іван Григорович Коваленко",
                "occupations": ["лікар"],
                "location_variants": ["Київ", "Борщагівка"],
                "repression_year": 1937,
                "rehabilitation_year": 1956
            }
        },
        {
            "id": "demo_002",
            "type": "rehabilitation_record",
            "year": 1938,
            "location": "с. Пирогів, Київська область",
            "title": "Справа №23456 - Петренко Василь Степанович",
            "content": "Петренко Василь Степанович, 1900 р.н., селянин-одноосібник, мешканець с. Пирогів. Заарештований як куркуль та ворог народу. Засуджений до 10 років таборів. Реабілітований посмертно.",
            "metadata": {
                "surnames": ["Петренко"],
                "given_names": ["Василь", "Степанович"],
                "occupations": ["селянин"],
                "location_variants": ["Пирогів"]
            }
        },
        {
            "id": "demo_003",
            "type": "rehabilitation_record",
            "year": 1941,
            "location": "м. Київ",
            "title": "Справа №34567 - Іваненко Марія Петрівна",
            "content": "Іваненко Марія Петрівна, 1910 р.н., вчителька початкової школи №45 м. Києва. Звинувачена у зв'язках з ОУН. Заслана до Сибіру на 5 років. Повернулась 1946 року. Реабілітована 1989 року.",
            "metadata": {
                "surnames": ["Іваненко"],
                "given_names": ["Марія", "Петрівна"],
                "occupations": ["вчителька"],
                "location_variants": ["Київ"]
            }
        }
    ]
    
    # Об'єднуємо все
    all_archives = archives + new_records + demo_records
    
    # Зберігаємо розширений файл
    output = {
        "archives": all_archives,
        "metadata": {
            "total_count": len(all_archives),
            "last_updated": datetime.now().isoformat(),
            "sources": ["original_10", "parsed_pdfs", "demo_records"]
        }
    }
    
    with open('archives_extended.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n" + "="*50)
    print("✅ ГОТОВО!")
    print(f"📊 Всього записів: {len(all_archives)}")
    print(f"   - Оригінальні: {len(archives)}")
    print(f"   - З PDF: {len(new_records)}")
    print(f"   - Демо: {len(demo_records)}")
    print(f"💾 Збережено: archives_extended.json")
    print("\n🎯 Тепер оновіть rag_engine.py щоб використовувати archives_extended.json")

if __name__ == "__main__":
    main()