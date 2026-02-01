/**
 * Song Storage Utility
 * Uses IndexedDB to persist songs (including audio/video blobs) across page refreshes.
 */

import { Song } from '../types';

const DB_NAME = 'RakkoMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

interface StoredSong {
    id: string;
    name: string;
    artist: string;
    audioBlob: Blob;
    videoBlob?: Blob;
    coverBlob?: Blob;
    lyrics?: string;
    metadata?: any;
    mysteryCode?: string;
}

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[SongStorage] Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log('[SongStorage] Created object store:', STORE_NAME);
            }
        };
    });
};

/**
 * Save a song to IndexedDB
 */
export const saveSong = async (song: Song): Promise<void> => {
    try {
        const db = await openDB();

        // Convert blob URL to actual blob if needed
        let audioBlob: Blob;
        if (song.file) {
            audioBlob = song.file;
        } else if (song.url.startsWith('blob:')) {
            const response = await fetch(song.url);
            audioBlob = await response.blob();
        } else {
            // External URL - can't persist, skip
            console.warn('[SongStorage] Cannot persist external URL song:', song.name);
            return;
        }

        let videoBlob: Blob | undefined;
        if (song.videoUrl && song.videoUrl.startsWith('blob:')) {
            try {
                const response = await fetch(song.videoUrl);
                videoBlob = await response.blob();
            } catch (e) {
                console.warn('[SongStorage] Failed to fetch video blob:', e);
            }
        }

        let coverBlob: Blob | undefined;
        if (song.coverUrl && song.coverUrl.startsWith('blob:')) {
            try {
                const response = await fetch(song.coverUrl);
                coverBlob = await response.blob();
            } catch (e) {
                console.warn('[SongStorage] Failed to fetch cover blob:', e);
            }
        }

        const storedSong: StoredSong = {
            id: song.id,
            name: song.name,
            artist: song.artist,
            audioBlob,
            videoBlob,
            coverBlob,
            lyrics: song.lyrics,
            metadata: song.metadata,
            mysteryCode: song.mysteryCode
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(storedSong);

            request.onsuccess = () => {
                console.log('[SongStorage] Saved song:', song.name);
                resolve();
            };

            request.onerror = () => {
                console.error('[SongStorage] Failed to save song:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('[SongStorage] Error saving song:', e);
    }
};

/**
 * Remove a song from IndexedDB
 */
export const removeSong = async (songId: string): Promise<void> => {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(songId);

            request.onsuccess = () => {
                console.log('[SongStorage] Removed song:', songId);
                resolve();
            };

            request.onerror = () => {
                console.error('[SongStorage] Failed to remove song:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('[SongStorage] Error removing song:', e);
    }
};

/**
 * Load all songs from IndexedDB
 */
export const loadAllSongs = async (): Promise<Song[]> => {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const storedSongs: StoredSong[] = request.result;
                const songs: Song[] = storedSongs.map(stored => {
                    // Create blob URLs from stored blobs
                    const audioUrl = URL.createObjectURL(stored.audioBlob);
                    const audioFile = new File([stored.audioBlob], `${stored.name}.mp3`, { type: stored.audioBlob.type });

                    let videoUrl: string | undefined;
                    if (stored.videoBlob) {
                        videoUrl = URL.createObjectURL(stored.videoBlob);
                    }

                    let coverUrl: string | undefined;
                    if (stored.coverBlob) {
                        coverUrl = URL.createObjectURL(stored.coverBlob);
                    }

                    return {
                        id: stored.id,
                        name: stored.name,
                        artist: stored.artist,
                        url: audioUrl,
                        file: audioFile,
                        videoUrl,
                        coverUrl,
                        lyrics: stored.lyrics,
                        metadata: stored.metadata,
                        mysteryCode: stored.mysteryCode
                    };
                });

                console.log('[SongStorage] Loaded', songs.length, 'songs from storage');
                resolve(songs);
            };

            request.onerror = () => {
                console.error('[SongStorage] Failed to load songs:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('[SongStorage] Error loading songs:', e);
        return [];
    }
};

/**
 * Clear all songs from IndexedDB
 */
export const clearAllSongs = async (): Promise<void> => {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[SongStorage] Cleared all songs');
                resolve();
            };

            request.onerror = () => {
                console.error('[SongStorage] Failed to clear songs:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('[SongStorage] Error clearing songs:', e);
    }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = async (): Promise<{ count: number; estimatedSize: string }> => {
    try {
        const db = await openDB();

        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const countRequest = store.count();

            countRequest.onsuccess = async () => {
                const count = countRequest.result;

                // Try to get storage estimate
                let estimatedSize = 'Unknown';
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    try {
                        const estimate = await navigator.storage.estimate();
                        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
                        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
                        estimatedSize = `${usedMB} MB / ${quotaMB} MB`;
                    } catch (e) {
                        // Ignore
                    }
                }

                resolve({ count, estimatedSize });
            };

            countRequest.onerror = () => {
                resolve({ count: 0, estimatedSize: 'Unknown' });
            };
        });
    } catch (e) {
        return { count: 0, estimatedSize: 'Unknown' };
    }
};
