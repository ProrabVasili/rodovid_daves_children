/**
 * API Module
 * Взаємодія з backend
 */

const API = (() => {
    const BASE_URL = 'http://localhost:8000/api/v1';

    // Пошук в архівах
    async function searchArchives(query, topK = 5) {
        try {
            const response = await fetch(`${BASE_URL}/search/magic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    top_k: topK
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    // Отримати дерево
    async function getTree() {
        try {
            const response = await fetch(`${BASE_URL}/tree`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get tree error:', error);
            throw error;
        }
    }

    // Додати особу
    async function addPerson(personData) {
        try {
            const response = await fetch(`${BASE_URL}/person`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(personData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Add person error:', error);
            throw error;
        }
    }

    // Перевірка здоров'я API
    async function healthCheck() {
        try {
            const response = await fetch(`${BASE_URL.replace('/api/v1', '')}/ `);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    return {
        searchArchives,
        getTree,
        addPerson,
        healthCheck
    };
})();

// Перевірка підключення при завантаженні
window.addEventListener('load', async () => {
    const isHealthy = await API.healthCheck();
    if (isHealthy) {
        console.log('✅ Backend API connected');
    } else {
        console.warn('⚠️ Backend API unavailable');
    }
});