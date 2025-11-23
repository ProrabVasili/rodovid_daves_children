"""
FastAPI Backend для "Родовід"
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import json

from rag_engine import RAGEngine

# ============ PYDANTIC MODELS ============

class PersonCreate(BaseModel):
    """Модель для створення нової особи"""
    name_blob: str  # Зашифроване ім'я
    birth_date_blob: str  # Зашифрована дата
    death_date: Optional[str] = None  # Не шифруємо для історичних осіб
    relation: str  # "PARENT", "CHILD", "SPOUSE"
    link_to_person_id: str
    private_notes_blob: Optional[str] = None


class SearchQuery(BaseModel):
    """Модель запиту пошуку"""
    query: str
    top_k: Optional[int] = 5


class TreeResponse(BaseModel):
    """Відповідь з деревом"""
    nodes: List[Dict]
    links: List[Dict]


# ============ FASTAPI APP ============

app = FastAPI(
    title="Родовід API",
    description="Backend для цифрового генеалогічного дерева",
    version="1.0.0"
)

# CORS для frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # У production треба вказати конкретні домени
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ ГЛОБАЛЬНИЙ СТАН (In-Memory DB) ============
# У production це буде Neo4j

GRAPH_DB = {
    "nodes": [
        {
            "id": "user_1",
            "name": "Олександр Коваленко",  # Root не шифруємо для демо
            "birth_date": "1995",
            "is_root": True,
            "encrypted": False
        }
    ],
    "links": []
}

# Ініціалізація RAG Engine
print("🚀 Ініціалізація RAG Engine...")
rag_engine = None

@app.on_event("startup")
async def startup_event():
    global rag_engine
    try:
        rag_engine = RAGEngine(archives_path="../data/archives.json")
        print("✅ RAG Engine готовий!")
    except Exception as e:
        print(f"❌ Помилка ініціалізації RAG: {e}")
        print("⚠️ API працюватиме без функції пошуку")


# ============ ENDPOINTS ============

@app.get("/")
async def root():
    """Перевірка здоров'я API"""
    return {
        "status": "healthy",
        "service": "Родовід API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "rag_status": "ready" if rag_engine else "unavailable"
    }


@app.get("/api/v1/tree", response_model=TreeResponse)
async def get_tree():
    """
    Отримати все дерево користувача
    
    Повертає:
    - nodes: Список всіх осіб (з зашифрованими даними)
    - links: Список зв'язків між особами
    
    Приклад відповіді:
    {
      "nodes": [
        {"id": "user_1", "name": "Ви", "is_root": true},
        {"id": "person_2", "name_blob": "ENC_ABC123...", "birth_date_blob": "ENC_XYZ..."}
      ],
      "links": [
        {"source": "person_2", "target": "user_1", "type": "PARENT"}
      ]
    }
    """
    return TreeResponse(
        nodes=GRAPH_DB["nodes"],
        links=GRAPH_DB["links"]
    )


@app.post("/api/v1/person")
async def add_person(person: PersonCreate):
    """
    Додати нову особу до дерева
    
    Приймає зашифровані дані (name_blob, birth_date_blob)
    Сервер НЕ розшифровує їх - зберігає як є (E2E)
    
    Приклад:
    POST /api/v1/person
    {
      "name_blob": "ENC_AQIDBAUG...",
      "birth_date_blob": "ENC_FGHIJK...",
      "death_date": "2005-10-12",
      "relation": "PARENT",
      "link_to_person_id": "user_1",
      "private_notes_blob": "ENC_LMNOP..."
    }
    """
    # Генеруємо ID
    new_id = f"person_{len(GRAPH_DB['nodes']) + 1}"
    
    # Створюємо новий вузол
    new_node = {
        "id": new_id,
        "name_blob": person.name_blob,  # Зберігаємо зашифроване
        "birth_date_blob": person.birth_date_blob,
        "death_date": person.death_date,  # Не зашифровано для історичних
        "private_notes_blob": person.private_notes_blob,
        "encrypted": True,
        "created_at": datetime.now().isoformat()
    }
    
    # Створюємо зв'язок
    new_link = {
        "source": new_id,
        "target": person.link_to_person_id,
        "type": person.relation
    }
    
    # Додаємо до "бази даних"
    GRAPH_DB["nodes"].append(new_node)
    GRAPH_DB["links"].append(new_link)
    
    print(f"✅ Додано нову особу: {new_id}")
    print(f"   name_blob: {person.name_blob[:20]}... (зашифровано)")
    print(f"   Зв'язок: {new_id} --[{person.relation}]--> {person.link_to_person_id}")
    
    return {
        "success": True,
        "person_id": new_id,
        "message": "Особу успішно додано (дані зашифровані E2E)"
    }


@app.post("/api/v1/search/magic")
async def magic_search(query: SearchQuery):
    """
    🔍 Магічний пошук в архівах (RAG + AI)
    
    Використовує:
    - Sentence-BERT для semantic search
    - Fuzzy matching для прізвищ
    - Евристичні правила для років, професій, локацій
    
    Приклад запиту:
    POST /api/v1/search/magic
    {
      "query": "мій прадід лікар Коваленко Київ 1920-х",
      "top_k": 5
    }
    
    Приклад відповіді:
    {
      "results": [
        {
          "id": "arch_001",
          "title": "Метричний запис...",
          "content": "...",
          "confidence_score": 0.89,
          "explanation": "Прізвище 'Коваленко' збігається • Рік 1920 • Професія 'лікар'"
        }
      ]
    }
    """
    if not rag_engine:
        raise HTTPException(
            status_code=503,
            detail="RAG Engine недоступний. Перевірте логи сервера."
        )
    
    try:
        results = rag_engine.search(
            query=query.query,
            top_k=query.top_k
        )
        
        return {
            "success": True,
            "query": query.query,
            "results_count": len(results),
            "results": results
        }
    
    except Exception as e:
        print(f"❌ Помилка пошуку: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Помилка пошуку: {str(e)}"
        )


@app.get("/api/v1/archives")
async def list_archives():
    """
    Отримати список всіх архівів (для дебагу)
    """
    try:
        with open("../data/archives.json", 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {
            "total": len(data['archives']),
            "archives": data['archives']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/merge/propose")
async def propose_merge(person_id_1: str, person_id_2: str):
    """
    🔀 Запропонувати об'єднання дублікатів
    
    (MVP: Проста евристика. У production: LLM аналіз)
    """
    # TODO: Реалізувати логіку пошуку дублікатів
    return {
        "is_potential_match": False,
        "confidence_score": 0.0,
        "explanation": "Функція в розробці (MVP)"
    }


# ============ АРХІТЕКТУРНІ КОМЕНТАРІ ДЛЯ ЖУРІ ============
"""
🏗️ PRODUCTION АРХІТЕКТУРА (для масштабування):

1. ГРАФОВА БД (Neo4j):
   
   CREATE (p:Person {
     id: $id,
     name_blob: $encrypted_name,
     birth_date_blob: $encrypted_date
   })
   
   MATCH (child:Person {id: $child_id})
   MATCH (parent:Person {id: $parent_id})
   CREATE (parent)-[:PARENT_OF]->(child)

2. ВЕКТОРНИЙ ПОШУК (Elasticsearch):
   
   - HNSW індекс для швидкого ANN search
   - Hybrid retrieval: BM25 + Vector Search
   - Reciprocal Rank Fusion для об'єднання результатів

3. E2E ШИФРУВАННЯ:
   
   - Клієнт шифрує: libsodium-js (XChaCha20-Poly1305)
   - Сервер зберігає: Base64 blobs
   - Ключі: Hierarchical (Master Key -> Family Keys -> Record Keys)

4. МАСШТАБУВАННЯ:
   
   - Sharding: По Family_ID (locality-aware)
   - Caching: Redis для hot nodes
   - Load Balancing: Nginx
   
5. БЕЗПЕКА:
   
   - JWT auth (Дія.Підпис)
   - Rate limiting (100 req/min)
   - Audit logs (незмінні)
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)