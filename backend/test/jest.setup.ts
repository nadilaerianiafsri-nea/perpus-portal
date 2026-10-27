import { jest } from '@jest/globals';

// Native ESM supplies test/expect globals, but legacy specs also use jest helpers.
Object.assign(globalThis, { jest });
