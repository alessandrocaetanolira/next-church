import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Configuração segura para crypto no ambiente Node/Vitest
if (!global.crypto) {
    (global as any).crypto = {
        randomUUID: () => Math.random().toString(36).substring(2, 15)
    };
} else {
    // Apenas estendemos se não houver conflito
    if (!global.crypto.randomUUID) {
         (global.crypto as any).randomUUID = () => Math.random().toString(36).substring(2, 15);
    }
}
