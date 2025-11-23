/**
 * Main Application Logic
 * Координує всі модулі
 */

// Глобальний стан
let selectedArchiveResult = null;

// ============ INITIALIZATION ============

window.addEventListener('load', async () => {
    console.log('🚀 Родовід Application Starting...');
    
    // Чекаємо поки все завантажиться
    await new Promise(resolve => setTimeout(resolve, 100));
    
    initializeEventListeners();
    console.log('✅ Application Ready!');
});

// ============ EVENT LISTENERS ============

function initializeEventListeners() {
    // Search
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Encryption toggle
    document.getElementById('encryptBtn').addEventListener('click', handleEncryptionToggle);

    // Add Person Modal
    document.getElementById('addBtn').addEventListener('click', showAddModal);
    document.getElementById('closeAddModal').addEventListener('click', closeAddModal);
    document.getElementById('cancelAddBtn').addEventListener('click', closeAddModal);
    document.getElementById('saveAddBtn').addEventListener('click', handleAddPerson);

    // Edit Person Modal
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditPerson);
    document.getElementById('deleteBtn').addEventListener('click', handleDeletePerson);

    // Archive Modal
    document.getElementById('closeArchiveModal').addEventListener('click', closeArchiveModal);
    document.getElementById('cancelArchiveBtn').addEventListener('click', closeArchiveModal);
    document.getElementById('saveArchiveBtn').addEventListener('click', handleArchiveAdd);

    // Info Panel
    document.getElementById('closePanelBtn').addEventListener('click', closeInfoPanel);
}

// ============ SEARCH ============

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        alert('⚠️ Введіть запит для пошуку');
        return;
    }

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Шукаємо в архівах...</p></div>';

    try {
        const results = await API.searchArchives(query, 5);
        displaySearchResults(results);
    } catch (error) {
        resultsContainer.innerHTML = `
            <div class="loading" style="color: #e53e3e;">
                <p>❌ Помилка пошуку</p>
                <p style="font-size: 12px;">${error.message}</p>
            </div>
        `;
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('results');
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p><strong>📭 Нічого не знайдено</strong></p>
                <p>Спробуйте інший запит</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.map(result => {
        const confidenceClass = result.confidence_score > 0.7 ? 'confidence-high' : 
                               result.confidence_score > 0.5 ? 'confidence-medium' : 'confidence-low';
        
        return `
            <div class="result-card">
                <div class="result-header">
                    <span class="result-title">${result.title}</span>
                    <span class="${confidenceClass} confidence-badge">
                        ${(result.confidence_score * 100).toFixed(0)}%
                    </span>
                </div>
                <div class="result-meta">
                    📅 ${result.year} | 📍 ${result.location}
                </div>
                <div class="result-explanation">
                    💡 ${result.explanation}
                </div>
                <button class="add-to-tree-btn" onclick="showArchiveModal(${JSON.stringify(result).replace(/"/g, '&quot;')})">
                    ➕ Додати до дерева
                </button>
            </div>
        `;
    }).join('');
}

// ============ ENCRYPTION ============

function handleEncryptionToggle() {
    const isEncrypted = TreeModule.toggleEncryption();
    
    const btn = document.getElementById('encryptBtn');
    const icon = document.getElementById('encryptIcon');
    const text = document.getElementById('encryptText');
    
    if (isEncrypted) {
        btn.className = 'control-btn encrypted';
        icon.textContent = '🔒';
        text.textContent = 'Зашифровано';
    } else {
        btn.className = 'control-btn decrypted';
        icon.textContent = '🔓';
        text.textContent = 'Розшифровано';
    }
}

// ============ ADD PERSON ============

function showAddModal() {
    // Заповнюємо список батьків
    const allNodes = TreeModule.getAllNodes();
    const parentSelect = document.getElementById('addParent');
    
    parentSelect.innerHTML = allNodes.map(node => 
        `<option value="${node.id}">${node.name}</option>`
    ).join('');

    // Очищуємо форму
    document.getElementById('addName').value = '';
    document.getElementById('addBirth').value = '';
    document.getElementById('addDeath').value = '';
    document.getElementById('addNotes').value = '';
    
    document.getElementById('addModal').classList.add('show');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('show');
}

async function handleAddPerson() {
    const name = document.getElementById('addName').value.trim();
    const birth = document.getElementById('addBirth').value.trim();
    const death = document.getElementById('addDeath').value.trim();
    const parentId = document.getElementById('addParent').value;
    const relation = document.getElementById('addRelation').value;
    const notes = document.getElementById('addNotes').value.trim();

    if (!name || !birth) {
        alert('⚠️ Заповніть обов\'язкові поля (ПІБ та рік народження)');
        return;
    }

    // Шифруємо приватні дані
    const encryptedName = await CryptoModule.encrypt(name);
    const encryptedBirth = await CryptoModule.encrypt(birth);
    const encryptedNotes = notes ? await CryptoModule.encrypt(notes) : '';

    const personData = {
        name: name, // Зберігаємо відкритий текст локально
        name_encrypted: encryptedName, // Для сервера
        birth: birth,
        birth_encrypted: encryptedBirth,
        death: death || null,
        notes: notes,
        notes_encrypted: encryptedNotes
    };

    // Додаємо в дерево
    const newNode = TreeModule.addPerson(personData, parentId, relation);
    
    if (newNode) {
        console.log('✅ Person added:', newNode);
        closeAddModal();
        
        // Показуємо нотифікацію
        alert(`✅ Додано: ${name}\n🔒 Дані зашифровані E2E`);
    } else {
        alert('❌ Помилка при додаванні особи');
    }
}

// ============ EDIT PERSON ============

function showEditModal(person) {
    document.getElementById('editName').value = person.name || '';
    document.getElementById('editBirth').value = person.birth || '';
    document.getElementById('editDeath').value = person.death || '';
    document.getElementById('editNotes').value = person.notes || '';
    
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
}

async function handleEditPerson() {
    const selectedNode = TreeModule.getSelectedNode();
    if (!selectedNode) return;

    const name = document.getElementById('editName').value.trim();
    const birth = document.getElementById('editBirth').value.trim();
    const death = document.getElementById('editDeath').value.trim();
    const notes = document.getElementById('editNotes').value.trim();

    if (!name || !birth) {
        alert('⚠️ ПІБ та рік народження обов\'язкові');
        return;
    }

    // Шифруємо оновлені дані
    const encryptedName = await CryptoModule.encrypt(name);
    const encryptedBirth = await CryptoModule.encrypt(birth);
    const encryptedNotes = notes ? await CryptoModule.encrypt(notes) : '';

    const updates = {
        name,
        name_encrypted: encryptedName,
        birth,
        birth_encrypted: encryptedBirth,
        death: death || null,
        notes,
        notes_encrypted: encryptedNotes
    };

    TreeModule.updatePerson(selectedNode.id, updates);
    closeEditModal();
    closeInfoPanel();
    
    alert(`✅ Оновлено: ${name}`);
}

function handleDeletePerson() {
    const selectedNode = TreeModule.getSelectedNode();
    if (!selectedNode) return;

    if (!confirm(`❌ Видалити "${selectedNode.name}"?\n\nЦю дію неможливо скасувати.`)) {
        return;
    }

    if (TreeModule.deletePerson(selectedNode.id)) {
        closeEditModal();
        closeInfoPanel();
        alert('✅ Особу видалено');
    } else {
        alert('❌ Помилка при видаленні');
    }
}

// ============ ARCHIVE MODAL ============

window.showArchiveModal = function(result) {
    selectedArchiveResult = result;
    
    // Витягуємо ім'я з контенту
    const nameMatch = result.content.match(/([А-ЯҐЄІЇ][а-яґєії]+\s[А-ЯҐЄІЇ][а-яґєії]+\s[А-ЯҐЄІЇ][а-яґєії]+)/);
    const name = nameMatch ? nameMatch[0] : 'Невідомо';
    
    document.getElementById('archiveInfo').innerHTML = `
        <div class="info-field">
            <label>Знайдена особа:</label>
            <value><strong>${name}</strong></value>
        </div>
        <div class="info-field">
            <label>Рік:</label>
            <value>${result.year}</value>
        </div>
        <div class="info-field">
            <label>Місце:</label>
            <value>${result.location}</value>
        </div>
        <div class="info-field">
            <label>Впевненість:</label>
            <value>${(result.confidence_score * 100).toFixed(0)}%</value>
        </div>
    `;
    
    // Заповнюємо список батьків
    const allNodes = TreeModule.getAllNodes();
    const parentSelect = document.getElementById('archiveParent');
    
    parentSelect.innerHTML = allNodes.map(node => 
        `<option value="${node.id}">${node.name}</option>`
    ).join('');
    
    document.getElementById('archiveModal').classList.add('show');
};

function closeArchiveModal() {
    document.getElementById('archiveModal').classList.remove('show');
    selectedArchiveResult = null;
}

async function handleArchiveAdd() {
    if (!selectedArchiveResult) return;

    const parentId = document.getElementById('archiveParent').value;
    const relation = document.getElementById('archiveRelation').value;

    // Витягуємо ім'я
    const nameMatch = selectedArchiveResult.content.match(/([А-ЯҐЄІЇ][а-яґєії]+\s[А-ЯҐЄІЇ][а-яґєії]+\s[А-ЯҐЄІЇ][а-яґєії]+)/);
    const name = nameMatch ? nameMatch[0] : 'Невідомо';

    // Шифруємо
    const encryptedName = await CryptoModule.encrypt(name);
    const encryptedBirth = await CryptoModule.encrypt(selectedArchiveResult.year.toString());

    const personData = {
        name,
        name_encrypted: encryptedName,
        birth: selectedArchiveResult.year.toString(),
        birth_encrypted: encryptedBirth,
        death: null,
        notes: `Знайдено в архіві: ${selectedArchiveResult.title}`,
        notes_encrypted: await CryptoModule.encrypt(`Знайдено в архіві: ${selectedArchiveResult.title}`)
    };

    const newNode = TreeModule.addPerson(personData, parentId, relation);
    
    if (newNode) {
        closeArchiveModal();
        alert(`✅ Додано з архіву: ${name} (${selectedArchiveResult.year})`);
    } else {
        alert('❌ Помилка при додаванні');
    }
}

// ============ INFO PANEL ============

window.showPersonInfo = async function(person) {
    const panel = document.getElementById('infoPanel');
    const nameEl = document.getElementById('infoName');
    const bodyEl = document.getElementById('infoBody');
    const actionsEl = document.getElementById('infoActions');

    // Розшифровуємо дані якщо потрібно
    const isEncrypted = TreeModule.getEncryptionState();
    let displayName = person.name;
    let displayBirth = person.birth;
    let displayNotes = person.notes || '';

    if (!isEncrypted && person.encrypted && !person.isRoot) {
        displayName = person.name;
        displayBirth = person.birth;
        displayNotes = person.notes || '';
    }

    nameEl.textContent = displayName;

    bodyEl.innerHTML = `
        <div class="info-field">
            <label>Рік народження:</label>
            <value>${displayBirth}</value>
        </div>
        ${person.death ? `
            <div class="info-field">
                <label>Рік смерті:</label>
                <value>${person.death}</value>
            </div>
        ` : ''}
        ${displayNotes ? `
            <div class="info-field">
                <label>Нотатки:</label>
                <value>${displayNotes}</value>
            </div>
        ` : ''}
        <div class="info-field">
            <label>Статус:</label>
            <value>${person.encrypted ? '🔒 Зашифровано E2E' : '🔓 Відкрито'}</value>
        </div>
    `;

    actionsEl.innerHTML = `
        <button class="btn btn-primary" onclick="showEditModal(TreeModule.getSelectedNode())">
            ✏️ Редагувати
        </button>
    `;

    panel.classList.add('show');
};

function closeInfoPanel() {
    document.getElementById('infoPanel').classList.remove('show');
}

// ============ UTILITIES ============

// Експортуємо функції в global scope для onclick
window.showArchiveModal = showArchiveModal;
window.showEditModal = showEditModal;

console.log('📱 App.js loaded');