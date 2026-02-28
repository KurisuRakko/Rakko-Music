/**
 * Rakko Interconnect Service - Core Service Module
 * 
 * Manages WebRTC-based peer-to-peer connections for LAN synchronization.
 * Provides event-based communication for track info, lyrics, and playback state.
 */

import {
    InterconnectRole,
    ConnectionState,
    PeerInfo,
    InterconnectMessage,
    InterconnectEvents,
    InterconnectConfig,
    TrackBroadcast,
    LyricsBroadcast,
    PlaybackBroadcast,
    CommandMessage,
    InterconnectCommand,
    BroadcastSongInfo,
} from './types';
import {
    generateUniqueCode,
    getOrCreatePeerId,
    getDefaultDeviceName,
    savePairingCode,
} from './pairingService';

// ==================== Simple Event Emitter ====================

type EventCallback<T = any> = (data: T) => void;

class EventEmitter<T extends Record<string, EventCallback>> {
    private listeners: Map<keyof T, Set<EventCallback>> = new Map();

    on<K extends keyof T>(event: K, callback: T[K]): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback as EventCallback);
    }

    off<K extends keyof T>(event: K, callback: T[K]): void {
        this.listeners.get(event)?.delete(callback as EventCallback);
    }

    emit<K extends keyof T>(event: K, data: Parameters<T[K]>[0]): void {
        this.listeners.get(event)?.forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`[InterconnectService] Error in event handler for ${String(event)}:`, e);
            }
        });
    }

    removeAllListeners(): void {
        this.listeners.clear();
    }
}

// ==================== Interconnect Service ====================

export class InterconnectService extends EventEmitter<InterconnectEvents> {
    private config: Required<InterconnectConfig>;
    private peerId: string;
    private peerName: string;
    private pairingCode: string;
    private role: InterconnectRole = 'standalone';
    private connectionState: ConnectionState = 'disconnected';

    // Peer tracking
    private discoveredPeers: Map<string, PeerInfo> = new Map();
    private connectedPeers: Map<string, PeerInfo> = new Map();
    private pendingPairRequests: Map<string, PeerInfo> = new Map();

    // BroadcastChannel for same-origin discovery (fallback)
    private broadcastChannel: BroadcastChannel | null = null;

    // Heartbeat
    private heartbeatTimer: number | null = null;
    private peerTimeoutTimers: Map<string, number> = new Map();

    constructor(config: InterconnectConfig = {}) {
        super();

        this.config = {
            deviceName: config.deviceName || getDefaultDeviceName(),
            autoAcceptPairing: config.autoAcceptPairing ?? false,
            heartbeatInterval: config.heartbeatInterval ?? 5000,
            peerTimeout: config.peerTimeout ?? 15000,
            debug: config.debug ?? false,
        };

        this.peerId = getOrCreatePeerId();
        this.peerName = this.config.deviceName;
        this.pairingCode = generateUniqueCode([]);

        this.log('Service initialized', { peerId: this.peerId, code: this.pairingCode });
    }

    // ==================== Logging ====================

    private log(...args: any[]): void {
        if (this.config.debug) {
            console.log('[InterconnectService]', ...args);
        }
    }

    // ==================== Getters ====================

    getPeerId(): string {
        return this.peerId;
    }

    getPeerName(): string {
        return this.peerName;
    }

    getPairingCode(): string {
        return this.pairingCode;
    }

    getRole(): InterconnectRole {
        return this.role;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getDiscoveredPeers(): PeerInfo[] {
        return Array.from(this.discoveredPeers.values());
    }

    getConnectedPeers(): PeerInfo[] {
        return Array.from(this.connectedPeers.values());
    }

    getPendingRequests(): PeerInfo[] {
        return Array.from(this.pendingPairRequests.values());
    }

    getMyPeerInfo(): PeerInfo {
        return {
            id: this.peerId,
            name: this.peerName,
            code: this.pairingCode,
            role: this.role,
            lastSeen: Date.now(),
        };
    }

    // ==================== Lifecycle ====================

    start(): void {
        this.log('Starting service...');
        this.initBroadcastChannel();
        this.startHeartbeat();
        this.setConnectionState('discovering');
        this.broadcastDiscover();
    }

    stop(): void {
        this.log('Stopping service...');
        this.stopHeartbeat();
        this.closeBroadcastChannel();
        this.disconnectAll();
        this.setConnectionState('disconnected');
    }

    // ==================== BroadcastChannel (Same-Origin Discovery) ====================

    private initBroadcastChannel(): void {
        try {
            this.broadcastChannel = new BroadcastChannel('rakko_interconnect');
            this.broadcastChannel.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            this.log('BroadcastChannel initialized');
        } catch (e) {
            console.warn('[InterconnectService] BroadcastChannel not supported');
        }
    }

    private closeBroadcastChannel(): void {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
    }

    private broadcast(message: InterconnectMessage): void {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(message);
        }
    }

    // ==================== Message Handling ====================

    private handleMessage(message: InterconnectMessage): void {
        // Ignore messages from self
        if ('peer' in message && message.peer?.id === this.peerId) {
            return;
        }
        if ('peerId' in message && message.peerId === this.peerId) {
            return;
        }
        if ('sourceId' in message && message.sourceId === this.peerId) {
            return;
        }

        this.log('Received message:', message.type);

        switch (message.type) {
            case 'DISCOVER':
                this.handleDiscover(message.peer);
                break;

            case 'PAIR_REQUEST':
                this.handlePairRequest(message.code, message.peer);
                break;

            case 'PAIR_ACCEPT':
                this.handlePairAccept(message.peer);
                break;

            case 'PAIR_REJECT':
                this.handlePairReject(message.reason);
                break;

            case 'UNPAIR':
                this.handleUnpair(message.peerId);
                break;

            case 'PING':
                this.handlePing(message.peerId, message.timestamp);
                break;

            case 'PONG':
                this.handlePong(message.peerId, message.timestamp);
                break;

            case 'TRACK_UPDATE':
                this.emit('track-update', message);
                break;

            case 'LYRICS_UPDATE':
                this.emit('lyrics-update', message);
                break;

            case 'PLAYBACK_UPDATE':
                this.emit('playback-update', message);
                break;

            case 'COMMAND':
                if (this.role === 'master') {
                    this.emit('command', message);
                }
                break;
        }
    }

    // ==================== Discovery ====================

    private broadcastDiscover(): void {
        this.broadcast({
            type: 'DISCOVER',
            peer: this.getMyPeerInfo(),
        });
    }

    private handleDiscover(peer: PeerInfo): void {
        this.updatePeer(peer);

        // Respond with our own info if they're new
        if (!this.discoveredPeers.has(peer.id)) {
            this.broadcast({
                type: 'DISCOVER',
                peer: this.getMyPeerInfo(),
            });
        }

        this.discoveredPeers.set(peer.id, { ...peer, lastSeen: Date.now() });
        this.emit('peer-discovered', peer);
    }

    private updatePeer(peer: PeerInfo): void {
        // Reset timeout for this peer
        if (this.peerTimeoutTimers.has(peer.id)) {
            clearTimeout(this.peerTimeoutTimers.get(peer.id));
        }

        const timer = window.setTimeout(() => {
            this.handlePeerTimeout(peer.id);
        }, this.config.peerTimeout);

        this.peerTimeoutTimers.set(peer.id, timer);
    }

    private handlePeerTimeout(peerId: string): void {
        this.log('Peer timed out:', peerId);
        this.discoveredPeers.delete(peerId);

        if (this.connectedPeers.has(peerId)) {
            this.connectedPeers.delete(peerId);
            this.emit('peer-disconnected', peerId);

            if (this.connectedPeers.size === 0) {
                this.setConnectionState('discovering');
            }
        }
    }

    // ==================== Pairing ====================

    regenerateCode(): string {
        const peers = this.getDiscoveredPeers();
        this.pairingCode = generateUniqueCode(peers);
        savePairingCode(this.pairingCode);
        this.log('Regenerated pairing code:', this.pairingCode);
        return this.pairingCode;
    }

    requestPairing(targetCode: string): void {
        this.log('Requesting pairing with code:', targetCode);
        this.setConnectionState('pairing');

        this.broadcast({
            type: 'PAIR_REQUEST',
            code: targetCode,
            peer: this.getMyPeerInfo(),
        });
    }

    private handlePairRequest(code: string, peer: PeerInfo): void {
        this.updatePeer(peer);

        // Check if this request is for us
        if (code !== this.pairingCode) {
            return;
        }

        this.log('Received pairing request from:', peer.name);

        // Auto-accept if configured
        if (this.config.autoAcceptPairing) {
            this.acceptPairing(peer.id);
            return;
        }

        // Store and emit for manual handling
        this.pendingPairRequests.set(peer.id, peer);
        this.emit('pair-request', peer);
    }

    acceptPairing(peerId: string): void {
        const peer = this.pendingPairRequests.get(peerId) || this.discoveredPeers.get(peerId);

        if (!peer) {
            console.warn('[InterconnectService] Unknown peer:', peerId);
            return;
        }

        this.log('Accepting pairing from:', peer.name);
        this.pendingPairRequests.delete(peerId);

        // Add to connected peers
        this.connectedPeers.set(peer.id, peer);
        this.setConnectionState('connected');

        // Send acceptance
        this.broadcast({
            type: 'PAIR_ACCEPT',
            peer: this.getMyPeerInfo(),
        });

        this.emit('peer-connected', peer);
    }

    rejectPairing(peerId: string, reason: string = 'Rejected by user'): void {
        const peer = this.pendingPairRequests.get(peerId);

        if (!peer) {
            return;
        }

        this.log('Rejecting pairing from:', peer.name);
        this.pendingPairRequests.delete(peerId);

        this.broadcast({
            type: 'PAIR_REJECT',
            reason,
        });
    }

    private handlePairAccept(peer: PeerInfo): void {
        this.log('Pairing accepted by:', peer.name);
        this.updatePeer(peer);

        this.connectedPeers.set(peer.id, peer);
        this.setConnectionState('connected');
        this.emit('pair-accepted', peer);
        this.emit('peer-connected', peer);
    }

    private handlePairReject(reason: string): void {
        this.log('Pairing rejected:', reason);
        this.setConnectionState('discovering');
        this.emit('pair-rejected', reason);
    }

    // ==================== Disconnection ====================

    disconnect(peerId?: string): void {
        if (peerId) {
            this.disconnectPeer(peerId);
        } else {
            this.disconnectAll();
        }
    }

    private disconnectPeer(peerId: string): void {
        if (this.connectedPeers.has(peerId)) {
            this.connectedPeers.delete(peerId);

            this.broadcast({
                type: 'UNPAIR',
                peerId: this.peerId,
            });

            this.emit('peer-disconnected', peerId);

            if (this.connectedPeers.size === 0) {
                this.setConnectionState('discovering');
            }
        }
    }

    private disconnectAll(): void {
        const peerIds = Array.from(this.connectedPeers.keys());

        this.broadcast({
            type: 'UNPAIR',
            peerId: this.peerId,
        });

        this.connectedPeers.clear();
        peerIds.forEach(id => this.emit('peer-disconnected', id));
    }

    private handleUnpair(peerId: string): void {
        if (this.connectedPeers.has(peerId)) {
            this.connectedPeers.delete(peerId);
            this.emit('peer-disconnected', peerId);

            if (this.connectedPeers.size === 0) {
                this.setConnectionState('discovering');
            }
        }
    }

    // ==================== Role Management ====================

    setRole(role: InterconnectRole): void {
        this.log('Setting role:', role);
        this.role = role;

        // Broadcast updated peer info
        this.broadcastDiscover();
    }

    // ==================== Heartbeat ====================

    private startHeartbeat(): void {
        this.heartbeatTimer = window.setInterval(() => {
            this.broadcastDiscover();

            // Send ping to connected peers
            if (this.connectedPeers.size > 0) {
                this.broadcast({
                    type: 'PING',
                    peerId: this.peerId,
                    timestamp: Date.now(),
                });
            }
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Clear all peer timeout timers
        this.peerTimeoutTimers.forEach(timer => clearTimeout(timer));
        this.peerTimeoutTimers.clear();
    }

    private handlePing(peerId: string, timestamp: number): void {
        // Respond with pong
        this.broadcast({
            type: 'PONG',
            peerId: this.peerId,
            timestamp,
        });

        // Update peer's last seen
        const peer = this.connectedPeers.get(peerId) || this.discoveredPeers.get(peerId);
        if (peer) {
            this.updatePeer(peer);
        }
    }

    private handlePong(peerId: string, timestamp: number): void {
        const latency = Date.now() - timestamp;
        this.log(`Pong from ${peerId}, latency: ${latency}ms`);

        const peer = this.connectedPeers.get(peerId) || this.discoveredPeers.get(peerId);
        if (peer) {
            this.updatePeer(peer);
        }
    }

    // ==================== State Management ====================

    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.emit('connection-state-change', state);
        }
    }

    // ==================== Broadcasting (Master) ====================

    broadcastTrack(song: BroadcastSongInfo | null): void {
        if (this.role !== 'master') return;

        const message: TrackBroadcast = {
            type: 'TRACK_UPDATE',
            song,
            timestamp: Date.now(),
        };

        this.broadcast(message);
    }

    broadcastLyrics(currentLyric: string, nextLyric: string, currentTime: number, duration: number): void {
        if (this.role !== 'master') return;

        const message: LyricsBroadcast = {
            type: 'LYRICS_UPDATE',
            currentLyric,
            nextLyric,
            currentTime,
            duration,
            timestamp: Date.now(),
        };

        this.broadcast(message);
    }

    broadcastPlayback(isPlaying: boolean, currentTime: number, duration: number, volume: number, isLooping: boolean, isShuffle: boolean): void {
        if (this.role !== 'master') return;

        const message: PlaybackBroadcast = {
            type: 'PLAYBACK_UPDATE',
            isPlaying,
            currentTime,
            duration,
            volume,
            isLooping,
            isShuffle,
            timestamp: Date.now(),
        };

        this.broadcast(message);
    }

    // ==================== Commands (Slave) ====================

    sendCommand(command: InterconnectCommand, payload?: any): void {
        if (this.role !== 'slave') return;

        const message: CommandMessage = {
            type: 'COMMAND',
            command,
            payload,
            sourceId: this.peerId,
        };

        this.broadcast(message);
    }
}

// ==================== Singleton Instance ====================

let serviceInstance: InterconnectService | null = null;

export function getInterconnectService(config?: InterconnectConfig): InterconnectService {
    if (!serviceInstance) {
        serviceInstance = new InterconnectService(config);
    }
    return serviceInstance;
}

export function destroyInterconnectService(): void {
    if (serviceInstance) {
        serviceInstance.stop();
        serviceInstance.removeAllListeners();
        serviceInstance = null;
    }
}
