/**
 * Rakko Interconnect Service - Type Definitions
 * 
 * Defines all TypeScript interfaces for the interconnect protocol,
 * including roles, pairing, broadcast payloads, and protocol messages.
 */

import { Song, AudioState } from '../types';

// ==================== Role Types ====================

/** Device role in the interconnect network */
export type InterconnectRole = 'master' | 'slave' | 'standalone';

/** Connection state */
export type ConnectionState = 'disconnected' | 'discovering' | 'pairing' | 'connected';

// ==================== Pairing Types ====================

/** Pairing state information */
export interface PairingState {
    /** 4-digit pairing code */
    code: string;
    /** Current device role */
    role: InterconnectRole;
    /** Unique device/session ID */
    peerId: string;
    /** Device display name */
    peerName: string;
    /** List of connected peers */
    connectedPeers: PeerInfo[];
    /** Current connection state */
    connectionState: ConnectionState;
}

/** Information about a connected peer */
export interface PeerInfo {
    /** Unique peer ID */
    id: string;
    /** Display name */
    name: string;
    /** Peer's pairing code */
    code: string;
    /** Peer's role */
    role: InterconnectRole;
    /** Last seen timestamp */
    lastSeen: number;
}

// ==================== Broadcast Payload Types ====================

/** Track information for broadcast (minimal, no File objects) */
export interface BroadcastSongInfo {
    id: string;
    name: string;
    artist: string;
    album?: string;
    coverUrl?: string;
    duration?: number;
}

/** Track update broadcast */
export interface TrackBroadcast {
    type: 'TRACK_UPDATE';
    song: BroadcastSongInfo | null;
    timestamp: number;
}

/** Lyrics update broadcast */
export interface LyricsBroadcast {
    type: 'LYRICS_UPDATE';
    /** Current active lyric line */
    currentLyric: string;
    /** Next lyric line (for preview) */
    nextLyric: string;
    /** Current time in seconds */
    currentTime: number;
    /** Total duration */
    duration: number;
    timestamp: number;
}

/** Playback state broadcast */
export interface PlaybackBroadcast {
    type: 'PLAYBACK_UPDATE';
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isLooping: boolean;
    isShuffle: boolean;
    timestamp: number;
}

// ==================== Protocol Message Types ====================

/** Discovery message for finding peers */
export interface DiscoverMessage {
    type: 'DISCOVER';
    peer: PeerInfo;
}

/** Pairing request message */
export interface PairRequestMessage {
    type: 'PAIR_REQUEST';
    code: string;
    peer: PeerInfo;
}

/** Pairing acceptance message */
export interface PairAcceptMessage {
    type: 'PAIR_ACCEPT';
    peer: PeerInfo;
}

/** Pairing rejection message */
export interface PairRejectMessage {
    type: 'PAIR_REJECT';
    reason: string;
}

/** Unpair/disconnect message */
export interface UnpairMessage {
    type: 'UNPAIR';
    peerId: string;
}

/** Heartbeat/ping message */
export interface PingMessage {
    type: 'PING';
    peerId: string;
    timestamp: number;
}

/** Heartbeat response */
export interface PongMessage {
    type: 'PONG';
    peerId: string;
    timestamp: number;
}

/** Remote control command from slave to master */
export interface CommandMessage {
    type: 'COMMAND';
    command: InterconnectCommand;
    payload?: any;
    sourceId: string;
}

/** Available remote commands */
export type InterconnectCommand =
    | 'PLAY'
    | 'PAUSE'
    | 'TOGGLE_PLAY'
    | 'NEXT'
    | 'PREV'
    | 'SEEK'
    | 'SET_VOLUME'
    | 'SET_LOOP'
    | 'SET_SHUFFLE';

/** Union type for all protocol messages */
export type InterconnectMessage =
    | DiscoverMessage
    | PairRequestMessage
    | PairAcceptMessage
    | PairRejectMessage
    | UnpairMessage
    | PingMessage
    | PongMessage
    | TrackBroadcast
    | LyricsBroadcast
    | PlaybackBroadcast
    | CommandMessage;

// ==================== Event Types ====================

/** Events emitted by the interconnect service */
export interface InterconnectEvents {
    [key: string]: (...args: any[]) => void;
    'peer-discovered': (peer: PeerInfo) => void;
    'peer-connected': (peer: PeerInfo) => void;
    'peer-disconnected': (peerId: string) => void;
    'pair-request': (peer: PeerInfo) => void;
    'pair-accepted': (peer: PeerInfo) => void;
    'pair-rejected': (reason: string) => void;
    'track-update': (data: TrackBroadcast) => void;
    'lyrics-update': (data: LyricsBroadcast) => void;
    'playback-update': (data: PlaybackBroadcast) => void;
    'command': (data: CommandMessage) => void;
    'connection-state-change': (state: ConnectionState) => void;
    'error': (error: Error) => void;
}

// ==================== Configuration Types ====================

/** Interconnect service configuration */
export interface InterconnectConfig {
    /** Device display name */
    deviceName?: string;
    /** Auto-accept pairing requests with matching code */
    autoAcceptPairing?: boolean;
    /** Heartbeat interval in ms (default: 5000) */
    heartbeatInterval?: number;
    /** Peer timeout in ms (default: 15000) */
    peerTimeout?: number;
    /** Enable debug logging */
    debug?: boolean;
}

/** Options for the useRakkoInterconnect hook */
export interface UseInterconnectOptions {
    /** Enable the service */
    enabled?: boolean;
    /** Initial role */
    role?: InterconnectRole;
    /** Device name */
    deviceName?: string;
    /** Current song (for master mode) */
    currentSong?: Song | null;
    /** Current audio state (for master mode) */
    audioState?: AudioState;
    /** Current lyrics line (for master mode) */
    currentLyric?: string;
    /** Next lyrics line (for master mode) */
    nextLyric?: string;
    /** Handlers for slave mode */
    onTrackUpdate?: (data: TrackBroadcast) => void;
    onLyricsUpdate?: (data: LyricsBroadcast) => void;
    onPlaybackUpdate?: (data: PlaybackBroadcast) => void;
    onCommand?: (data: CommandMessage) => void;
}

/** Return type for useRakkoInterconnect hook */
export interface UseInterconnectReturn {
    /** Current pairing code */
    pairingCode: string;
    /** Current role */
    role: InterconnectRole;
    /** Connection state */
    connectionState: ConnectionState;
    /** Connected peers */
    connectedPeers: PeerInfo[];
    /** Discovered peers */
    discoveredPeers: PeerInfo[];
    /** Set device role */
    setRole: (role: InterconnectRole) => void;
    /** Regenerate pairing code */
    regenerateCode: () => void;
    /** Request pairing with a peer by code */
    pairWithCode: (code: string) => void;
    /** Accept pairing request */
    acceptPairing: (peerId: string) => void;
    /** Reject pairing request */
    rejectPairing: (peerId: string, reason?: string) => void;
    /** Disconnect from peer */
    disconnect: (peerId?: string) => void;
    /** Send command to master (slave only) */
    sendCommand: (command: InterconnectCommand, payload?: any) => void;
    /** Broadcast current state (master only) */
    broadcastState: () => void;
    /** Service enabled state */
    isEnabled: boolean;
    /** Toggle service on/off */
    setEnabled: (enabled: boolean) => void;
}
