/**
 * Tree Visualization Module
 * D3.js ієрархічне дерево
 */

const TreeModule = (() => {
    let svg, g, tree, zoom;
    let selectedNode = null;
    let isEncrypted = true;

    // Початкові дані дерева
    let treeData = {
        name: "Олександр Коваленко",
        birth: "1995",
        id: "root",
        isRoot: true,
        encrypted: false,
        notes: "",
        children: []
    };

    // Ініціалізація
    function init() {
        const width = window.innerWidth - 350;
        const height = window.innerHeight;

        svg = d3.select('#graph')
            .attr('width', width)
            .attr('height', height);

        g = svg.append('g')
            .attr('transform', `translate(${width / 2}, 50)`);

        // Tree layout
        tree = d3.tree()
            .size([width - 200, height - 200])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

        // Zoom behavior
        zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', 
                    `translate(${event.transform.x + width/2}, ${event.transform.y + 50}) scale(${event.transform.k})`
                );
            });

        svg.call(zoom);

        console.log('🌳 Tree initialized');
        render();
    }

    // Рендер дерева
    function render() {
        // Створюємо ієрархію
        const root = d3.hierarchy(treeData);
        tree(root);

        // Лінії (зв'язки)
        const link = g.selectAll('.link')
            .data(root.links())
            .join('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Вузли
        const node = g.selectAll('.node')
            .data(root.descendants())
            .join('g')
            .attr('class', d => {
                let classes = ['node'];
                if (d.data.isRoot) classes.push('root');
                if (d.data.encrypted) classes.push('encrypted');
                if (selectedNode && selectedNode.id === d.data.id) classes.push('selected');
                return classes.join(' ');
            })
            .attr('transform', d => `translate(${d.x}, ${d.y})`)
            .on('click', (event, d) => handleNodeClick(d));

        // Очищуємо попередні елементи
        node.selectAll('*').remove();

        // Коло
        node.append('circle')
            .attr('r', 35)
            .transition()
            .duration(300)
            .attr('r', 40);

        // Текст всередині (ініціали або іконка)
        node.append('text')
            .attr('dy', 5)
            .style('font-size', '14px')
            .text(d => {
                if (isEncrypted && d.data.encrypted && !d.data.isRoot) {
                    return '🔒';
                }
                const nameParts = d.data.name.split(' ');
                return nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
            });

        // Підпис (ім'я)
        node.append('text')
            .attr('class', 'node-name')
            .attr('dy', 60)
            .text(d => {
                if (isEncrypted && d.data.encrypted && !d.data.isRoot) {
                    return '[Зашифровано]';
                }
                return d.data.name.length > 18 ? d.data.name.substring(0, 18) + '...' : d.data.name;
            });
    }

    // Клік по вузлу
    function handleNodeClick(d) {
        selectedNode = d.data;
        render();
        
        // Відображаємо інфо-панель
        if (window.showPersonInfo) {
            window.showPersonInfo(d.data);
        }
    }

    // Знайти вузол по ID
    function findNode(node, id) {
        if (node.id === id) return node;
        if (node.children) {
            for (let child of node.children) {
                const found = findNode(child, id);
                if (found) return found;
            }
        }
        return null;
    }

    // Знайти батьківський вузол
    function findParentOfNode(node, childId) {
        if (node.children) {
            if (node.children.some(c => c.id === childId)) {
                return node;
            }
            for (let child of node.children) {
                const found = findParentOfNode(child, childId);
                if (found) return found;
            }
        }
        return null;
    }

    // Отримати всі вузли (плоский список)
    function getAllNodes(node = treeData) {
        let result = [node];
        if (node.children) {
            node.children.forEach(child => {
                result = result.concat(getAllNodes(child));
            });
        }
        return result;
    }

    // Додати особу
    function addPerson(personData, parentId, relation = 'child') {
        const newNode = {
            ...personData,
            id: `person_${Date.now()}`,
            encrypted: true,
            children: []
        };

        const parent = findNode(treeData, parentId);
        
        if (!parent) {
            console.error('Parent not found:', parentId);
            return null;
        }

        if (relation === 'child') {
            // Додаємо як дитину
            if (!parent.children) parent.children = [];
            parent.children.push(newNode);
        } else if (relation === 'parent') {
            // Додаємо як батька (складніше)
            const grandparent = findParentOfNode(treeData, parentId);
            if (grandparent) {
                // Вставляємо новий вузол між grandparent і parent
                const parentIndex = grandparent.children.indexOf(parent);
                grandparent.children[parentIndex] = newNode;
                newNode.children = [parent];
            } else {
                // Якщо parent - це root, створюємо новий root
                const oldRoot = {...treeData};
                Object.assign(treeData, newNode);
                treeData.children = [oldRoot];
            }
        } else if (relation === 'spouse') {
            // Подружжя - додаємо як сиблінг
            const grandparent = findParentOfNode(treeData, parentId);
            if (grandparent) {
                grandparent.children.push(newNode);
            }
        }

        render();
        return newNode;
    }

    // Оновити особу
    function updatePerson(id, updates) {
        const node = findNode(treeData, id);
        if (node) {
            Object.assign(node, updates);
            render();
            return true;
        }
        return false;
    }

    // Видалити особу
    function deletePerson(id) {
        if (id === 'root') {
            alert('⚠️ Неможливо видалити кореневий вузол');
            return false;
        }

        const parent = findParentOfNode(treeData, id);
        if (parent) {
            parent.children = parent.children.filter(c => c.id !== id);
            selectedNode = null;
            render();
            return true;
        }
        return false;
    }

    // Перемикання шифрування
    function toggleEncryption() {
        isEncrypted = !isEncrypted;
        render();
        return isEncrypted;
    }

    // Отримати стан шифрування
    function getEncryptionState() {
        return isEncrypted;
    }

    // Отримати дані дерева
    function getTreeData() {
        return treeData;
    }

    // Встановити дані дерева
    function setTreeData(data) {
        treeData = data;
        render();
    }

    // Публічний API
    return {
        init,
        render,
        addPerson,
        updatePerson,
        deletePerson,
        toggleEncryption,
        getEncryptionState,
        getAllNodes,
        findNode,
        getTreeData,
        setTreeData,
        getSelectedNode: () => selectedNode
    };
})();

// Ініціалізація при завантаженні D3
window.addEventListener('load', () => {
    if (typeof d3 === 'undefined') {
        console.error('❌ D3.js not loaded!');
        alert('D3.js не завантажився. Перевірте інтернет-з\'єднання.');
        return;
    }
    
    TreeModule.init();
    console.log('✅ Tree module ready');
});