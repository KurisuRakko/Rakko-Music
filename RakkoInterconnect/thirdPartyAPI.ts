/**
 * Rakko Interconnect Service - Third-Party API
 * 
 * Exposes a global API for third-party applications to integrate
 * with Rakko Music Player's interconnect service.
 * 
 * Usage:
 *   window.RakkoInterconnect.onTrackChange((data) => console.log(data));
 *   window.RakkoInterconnect.sendCommand('PAUSE');
 */

import {
    InterconnectRole,
    ConnectionState,
    PeerInfo,
    TrackBroadcast,
    LyricsBroadcast,
    PlaybackBroadcast,
    InterconnectCommand,
    BroadcastSongInfo,
} from './types';
import { getInterconnectService, InterconnectService } from './interconnectService';

// ==================== API Types ====================

type TrackChangeCallback = (data: { song: BroadcastSongInfo | null; timestamp: number }) => void;
type LyricsChangeCallback = (data: { currentLyric: string; nextLyric: string; currentTime: number; duration: number }) => void;
type PlaybackChangeCallback = (data: { isPlaying: boolean; currentTime: number; duration: number; volume: number }) => void;
type ConnectionChangeCallback = (data: { state: ConnectionState; peers: PeerInfo[] }) => void;

interface RakkoInterconnectAPI {
    /** API Version */
    version: string;

    /** Check if the API is ready */
    isReady: () => boolean;

    /** Get current connection state */
    getConnectionState: () => ConnectionState;

    /** Get current role */
    getRole: () => InterconnectRole;

    /** Get pairing code */
    getPairingCode: () => string;

    /** Get connected peers */
    getConnectedPeers: () => PeerInfo[];

    /** Subscribe to track changes */
    onTrackChange: (callback: TrackChangeCallback) => () => void;

    /** Subscribe to lyrics updates */
    onLyricsChange: (callback: LyricsChangeCallback) => () => void;

    /** Subscribe to playback state changes */
    onPlaybackChange: (callback: PlaybackChangeCallback) => () => void;

    /** Subscribe to connection state changes */
    onConnectionChange: (callback: ConnectionChangeCallback) => () => void;

    /** Send a command to the master (slave only) */
    sendCommand: (command: InterconnectCommand, payload?: any) => void;

    /** Request pairing with a code */
    requestPairing: (code: string) => void;

    /** Disconnect from peers */
    disconnect: () => void;
}

// ==================== API Implementation ====================

class RakkoInterconnectAPIImpl implements RakkoInterconnectAPI {
    version = '1.0.0';

    private service: InterconnectService | null = null;
    private trackCallbacks: Set<TrackChangeCallback> = new Set();
    private lyricsCallbacks: Set<LyricsChangeCallback> = new Set();
    private playbackCallbacks: Set<PlaybackChangeCallback> = new Set();
    private connectionCallbacks: Set<ConnectionChangeCallback> = new Set();
    private initialized = false;

    constructor() {
        // Defer initialization
        if (typeof window !== 'undefined') {
            // Will be initialized when the main app starts the service
            this.checkAndInit();
        }
    }

    private checkAndInit(): void {
        if (this.initialized) return;

        try {
            this.service = getInterconnectService();
            this.setupListeners();
            this.initialized = true;
        } catch (e) {
            // Service not ready yet, will be initialized later
            setTimeout(() => this.checkAndInit(), 1000);
        }
    }

    private setupListeners(): void {
        if (!this.service) return;

        this.service.on('track-update', (data: TrackBroadcast) => {
            this.trackCallbacks.forEach(cb => {
                try {
                    cb({ song: data.song, timestamp: data.timestamp });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in track callback:', e);
                }
            });
        });

        this.service.on('lyrics-update', (data: LyricsBroadcast) => {
            this.lyricsCallbacks.forEach(cb => {
                try {
                    cb({
                        currentLyric: data.currentLyric,
                        nextLyric: data.nextLyric,
                        currentTime: data.currentTime,
                        duration: data.duration,
                    });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in lyrics callback:', e);
                }
            });
        });

        this.service.on('playback-update', (data: PlaybackBroadcast) => {
            this.playbackCallbacks.forEach(cb => {
                try {
                    cb({
                        isPlaying: data.isPlaying,
                        currentTime: data.currentTime,
                        duration: data.duration,
                        volume: data.volume,
                    });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in playback callback:', e);
                }
            });
        });

        this.service.on('connection-state-change', (state: ConnectionState) => {
            const peers = this.service?.getConnectedPeers() || [];
            this.connectionCallbacks.forEach(cb => {
                try {
                    cb({ state, peers });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in connection callback:', e);
                }
            });
        });

        this.service.on('peer-connected', () => {
            const state = this.service?.getConnectionState() || 'disconnected';
            const peers = this.service?.getConnectedPeers() || [];
            this.connectionCallbacks.forEach(cb => {
                try {
                    cb({ state, peers });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in connection callback:', e);
                }
            });
        });

        this.service.on('peer-disconnected', () => {
            const state = this.service?.getConnectionState() || 'disconnected';
            const peers = this.service?.getConnectedPeers() || [];
            this.connectionCallbacks.forEach(cb => {
                try {
                    cb({ state, peers });
                } catch (e) {
                    console.error('[RakkoInterconnectAPI] Error in connection callback:', e);
                }
            });
        });
    }

    isReady(): boolean {
        return this.initialized && this.service !== null;
    }

    getConnectionState(): ConnectionState {
        return this.service?.getConnectionState() || 'disconnected';
    }

    getRole(): InterconnectRole {
        return this.service?.getRole() || 'standalone';
    }

    getPairingCode(): string {
        return this.service?.getPairingCode() || '';
    }

    getConnectedPeers(): PeerInfo[] {
        return this.service?.getConnectedPeers() || [];
    }

    onTrackChange(callback: TrackChangeCallback): () => void {
        this.trackCallbacks.add(callback);
        return () => this.trackCallbacks.delete(callback);
    }

    onLyricsChange(callback: LyricsChangeCallback): () => void {
        this.lyricsCallbacks.add(callback);
        return () => this.lyricsCallbacks.delete(callback);
    }

    onPlaybackChange(callback: PlaybackChangeCallback): () => void {
        this.playbackCallbacks.add(callback);
        return () => this.playbackCallbacks.delete(callback);
    }

    onConnectionChange(callback: ConnectionChangeCallback): () => void {
        this.connectionCallbacks.add(callback);
        return () => this.connectionCallbacks.delete(callback);
    }

    sendCommand(command: InterconnectCommand, payload?: any): void {
        if (this.service) {
            this.service.sendCommand(command, payload);
        } else {
            console.warn('[RakkoInterconnectAPI] Service not initialized');
        }
    }

    requestPairing(code: string): void {
        if (this.service) {
            this.service.requestPairing(code);
        } else {
            console.warn('[RakkoInterconnectAPI] Service not initialized');
        }
    }

    disconnect(): void {
        if (this.service) {
            this.service.disconnect();
        }
    }
}

// ==================== Global API Export ====================

let apiInstance: RakkoInterconnectAPIImpl | null = null;

/**
 * Initialize and expose the global API
 */
export function initThirdPartyAPI(): RakkoInterconnectAPI {
    if (!apiInstance) {
        apiInstance = new RakkoInterconnectAPIImpl();

        // Expose globally
        if (typeof window !== 'undefined') {
            (window as any).RakkoInterconnect = apiInstance;
        }
    }

    return apiInstance;
}

/**
 * Get the API instance (without initializing if not ready)
 */
export function getThirdPartyAPI(): RakkoInterconnectAPI | null {
    return apiInstance;
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
    initThirdPartyAPI();
}
