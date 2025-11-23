/**
 * E2E Encryption Module
 * Використовує Web Crypto API
 */

const CryptoModule = (() => {
    let encryptionKey = null;

    // Генерація ключа з пароля
    async function generateKey(password = 'demo-key-родовід-2025') {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        
        encryptionKey = await crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
        
        console.log('🔐 Encryption key generated');
        return encryptionKey;
    }

    // Шифрування тексту
    async function encrypt(text) {
        if (!encryptionKey) {
            await generateKey();
        }

        if (!text || text.trim() === '') {
            return '';
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                encryptionKey,
                data
            );

            // Об'єднуємо IV та зашифровані дані
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Перетворюємо в Base64
            return 'ENC_' + btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption error:', error);
            return text; // Fallback
        }
    }

    // Розшифрування тексту
    async function decrypt(encryptedText) {
        if (!encryptionKey) {
            await generateKey();
        }

        if (!encryptedText || !encryptedText.startsWith('ENC_')) {
            return encryptedText; // Не зашифровано
        }

        try {
            // Видаляємо префікс
            const base64 = encryptedText.substring(4);
            const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            
            // Розділяємо IV та дані
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                encryptionKey,
                data
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            return '[🔒 ENCRYPTED]'; // Fallback
        }
    }

    // Перевірка чи текст зашифрований
    function isEncrypted(text) {
        return text && text.startsWith('ENC_');
    }

    // Публічний API
    return {
        generateKey,
        encrypt,
        decrypt,
        isEncrypted
    };
})();

// Ініціалізація при завантаженні
window.addEventListener('load', () => {
    CryptoModule.generateKey();
});