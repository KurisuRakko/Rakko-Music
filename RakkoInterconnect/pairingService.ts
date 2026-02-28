/**
 * Rakko Interconnect Service - Pairing Code Management
 * 
 * Handles generation and validation of 4-digit pairing codes
 * with collision detection capabilities.
 */

import { PeerInfo } from './types';

/** Minimum and maximum pairing code values */
const MIN_CODE = 1000;
const MAX_CODE = 9999;

/** Storage key for persisting pairing code */
const STORAGE_KEY = 'rakko_interconnect_pairing_code';

/**
 * Generate a random 4-digit pairing code
 * @returns A 4-digit string code (1000-9999)
 */
export function generatePairingCode(): string {
    const code = Math.floor(Math.random() * (MAX_CODE - MIN_CODE + 1)) + MIN_CODE;
    return code.toString();
}

/**
 * Validate a pairing code format
 * @param code - Code to validate
 * @returns true if code is valid 4-digit format
 */
export function validatePairingCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    if (code.length !== 4) return false;
    const num = parseInt(code, 10);
    return !isNaN(num) && num >= MIN_CODE && num <= MAX_CODE;
}

/**
 * Check if a pairing code collides with any known peer codes
 * @param code - Code to check
 * @param knownPeers - List of known peers
 * @returns true if code is already in use
 */
export function checkCodeCollision(code: string, knownPeers: PeerInfo[]): boolean {
    return knownPeers.some(peer => peer.code === code);
}

/**
 * Generate a unique pairing code that doesn't collide with known peers
 * @param knownPeers - List of known peers to avoid collision with
 * @param maxAttempts - Maximum regeneration attempts (default: 100)
 * @returns A unique 4-digit code
 * @throws Error if unable to generate unique code after max attempts
 */
export function generateUniqueCode(knownPeers: PeerInfo[], maxAttempts: number = 100): string {
    let attempts = 0;
    let code = generatePairingCode();

    while (checkCodeCollision(code, knownPeers) && attempts < maxAttempts) {
        code = generatePairingCode();
        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.warn('[PairingService] Max attempts reached, using potentially colliding code');
    }

    return code;
}

/**
 * Get or create a persistent pairing code
 * Uses localStorage to persist code across sessions
 * @param knownPeers - Optional list of peers to check collision
 * @returns Persisted or newly generated code
 */
export function getOrCreatePairingCode(knownPeers: PeerInfo[] = []): string {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && validatePairingCode(stored)) {
            // Check if stored code collides with known peers
            if (!checkCodeCollision(stored, knownPeers)) {
                return stored;
            }
        }
    } catch (e) {
        console.warn('[PairingService] Unable to access localStorage');
    }

    // Generate new code
    const newCode = generateUniqueCode(knownPeers);
    savePairingCode(newCode);
    return newCode;
}

/**
 * Save pairing code to persistent storage
 * @param code - Code to save
 */
export function savePairingCode(code: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
        console.warn('[PairingService] Unable to save to localStorage');
    }
}

/**
 * Clear saved pairing code
 */
export function clearPairingCode(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('[PairingService] Unable to clear localStorage');
    }
}

/**
 * Generate a unique peer ID
 * @returns A unique identifier string
 */
export function generatePeerId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `rakko-${timestamp}-${random}`;
}

/**
 * Get or create a persistent peer ID
 * @returns Persisted or newly generated peer ID
 */
export function getOrCreatePeerId(): string {
    const PEER_ID_KEY = 'rakko_interconnect_peer_id';

    try {
        const stored = localStorage.getItem(PEER_ID_KEY);
        if (stored) {
            return stored;
        }
    } catch (e) {
        console.warn('[PairingService] Unable to access localStorage');
    }

    const newId = generatePeerId();

    try {
        localStorage.setItem(PEER_ID_KEY, newId);
    } catch (e) {
        console.warn('[PairingService] Unable to save to localStorage');
    }

    return newId;
}

/**
 * Get default device name
 * @returns A human-readable device name
 */
export function getDefaultDeviceName(): string {
    const userAgent = navigator.userAgent;

    // Try to detect device type
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Device';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Windows/i.test(userAgent)) return 'Windows PC';
    if (/Linux/i.test(userAgent)) return 'Linux PC';

    return 'Rakko Music Player';
}
