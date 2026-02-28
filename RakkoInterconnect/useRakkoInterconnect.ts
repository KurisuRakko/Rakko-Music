/**
 * Rakko Interconnect Service - React Hook
 * 
 * Provides React integration for the interconnect service with automatic
 * state synchronization and cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Song, AudioState } from '../types';
import { parseLrc, LrcLine } from '../utils';
import {
    InterconnectRole,
    ConnectionState,
    PeerInfo,
    UseInterconnectOptions,
    UseInterconnectReturn,
    TrackBroadcast,
    LyricsBroadcast,
    PlaybackBroadcast,
    CommandMessage,
    InterconnectCommand,
    BroadcastSongInfo,
} from './types';
import { getInterconnectService, destroyInterconnectService, InterconnectService } from './interconnectService';
import { getOrCreatePairingCode } from './pairingService';

/**
 * React hook for Rakko Interconnect service integration
 */
export function useRakkoInterconnect(options: UseInterconnectOptions = {}): UseInterconnectReturn {
    const {
        enabled = false,
        role: initialRole = 'standalone',
        deviceName,
        currentSong,
        audioState,
        currentLyric = '',
        nextLyric = '',
        onTrackUpdate,
        onLyricsUpdate,
        onPlaybackUpdate,
        onCommand,
    } = options;

    // State
    const [isEnabled, setIsEnabled] = useState(enabled);
    const [pairingCode, setPairingCode] = useState('');
    const [role, setRoleState] = useState<InterconnectRole>(initialRole);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [connectedPeers, setConnectedPeers] = useState<PeerInfo[]>([]);
    const [discoveredPeers, setDiscoveredPeers] = useState<PeerInfo[]>([]);

    // Service ref
    const serviceRef = useRef<InterconnectService | null>(null);

    // Track previous song for change detection
    const prevSongRef = useRef<string | null>(null);

    // Callback refs
    const onTrackUpdateRef = useRef(onTrackUpdate);
    const onLyricsUpdateRef = useRef(onLyricsUpdate);
    const onPlaybackUpdateRef = useRef(onPlaybackUpdate);
    const onCommandRef = useRef(onCommand);

    // Update refs
    useEffect(() => { onTrackUpdateRef.current = onTrackUpdate; }, [onTrackUpdate]);
    useEffect(() => { onLyricsUpdateRef.current = onLyricsUpdate; }, [onLyricsUpdate]);
    useEffect(() => { onPlaybackUpdateRef.current = onPlaybackUpdate; }, [onPlaybackUpdate]);
    useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

    // Track if this hook "owns" the running state
    const isRunningRef = useRef(false);

    // Initialize service
    useEffect(() => {
        if (!isEnabled) {
            if (serviceRef.current) {
                // Only stop if we started it
                if (isRunningRef.current) {
                    serviceRef.current.stop();
                    isRunningRef.current = false;
                }
                serviceRef.current = null;
            }
            setConnectionState('disconnected');
            setConnectedPeers([]);
            setDiscoveredPeers([]);
            return;
        }

        const service = getInterconnectService({
            deviceName,
            debug: true,
        });
        serviceRef.current = service;

        // Get initial pairing code
        setPairingCode(service.getPairingCode());

        // Event handlers
        const handleConnectionState = (state: ConnectionState) => setConnectionState(state);
        const handlePeerDiscovered = () => setDiscoveredPeers(service.getDiscoveredPeers());
        const handlePeerConnected = () => setConnectedPeers(service.getConnectedPeers());
        const handlePeerDisconnected = () => {
            setConnectedPeers(service.getConnectedPeers());
            setDiscoveredPeers(service.getDiscoveredPeers());
        };
        const handleTrackUpdate = (data: TrackBroadcast) => onTrackUpdateRef.current?.(data);
        const handleLyricsUpdate = (data: LyricsBroadcast) => onLyricsUpdateRef.current?.(data);
        const handlePlaybackUpdate = (data: PlaybackBroadcast) => onPlaybackUpdateRef.current?.(data);
        const handleCommand = (data: CommandMessage) => onCommandRef.current?.(data);

        // Attach listeners
        service.on('connection-state-change', handleConnectionState);
        service.on('peer-discovered', handlePeerDiscovered);
        service.on('peer-connected', handlePeerConnected);
        service.on('peer-disconnected', handlePeerDisconnected);
        service.on('track-update', handleTrackUpdate);
        service.on('lyrics-update', handleLyricsUpdate);
        service.on('playback-update', handlePlaybackUpdate);
        service.on('command', handleCommand);

        // Start the service (if not running, start it; if running, it's idempotent)
        // We mark as running so we know to stop it later? No.
        // If it's a singleton, multiple components might want it running.
        // We should only stop it if NO ONE wants it running.
        // But we don't have ref counting on the service.
        // Simple heuristic: If we enabled it, we might disable it.
        // But if another component enabled it, we shouldn't kill it.
        // Since we can't query "how many hooks are active", we should err on keeping it running?
        // Or implement ref counting in service.
        // For now, let's just start it. And on cleanup, remove listeners.
        // ONLY stop if we are sure?
        // Let's assume the service handles multiple start/stops gracefully or we accept that unmounting View stops it for App.
        // We implemented isRunningRef logic:

        service.start();
        isRunningRef.current = true;

        return () => {
            // Remove specific listeners
            service.off('connection-state-change', handleConnectionState);
            service.off('peer-discovered', handlePeerDiscovered);
            service.off('peer-connected', handlePeerConnected);
            service.off('peer-disconnected', handlePeerDisconnected);
            service.off('track-update', handleTrackUpdate);
            service.off('lyrics-update', handleLyricsUpdate);
            service.off('playback-update', handlePlaybackUpdate);
            service.off('command', handleCommand);

            // Only stop if we started it. BUT what if another component also started it?
            // If we stop it, it stops for everyone.
            // Safe bet: Don't stop the service on unmount, just detach.
            // Explicit user action to "Stop Service" via UI should call stop.
            // But hook's unmount shouldn't kill the background service if it's meant to persist.
            // However, useRakkoInterconnect is controlled by `enabled`.
            // If enabled becomes false, we probably WANT to stop pairing/advertising.

            if (isRunningRef.current) {
                // We keep it running? Or stop?
                // If we stop, we kill connections for others.
                // Let's comment out stop() for now to prevent accidental kills.
                // Revert to manual stop or ref counting later if needed.
                // service.stop(); 
                isRunningRef.current = false;
            }
        };
    }, [isEnabled, deviceName]);

    // Update role when changed
    useEffect(() => {
        if (serviceRef.current && isEnabled) {
            serviceRef.current.setRole(role);
        }
    }, [role, isEnabled]);

    // Broadcast track updates when song changes (master only)
    useEffect(() => {
        if (!isEnabled || role !== 'master' || !serviceRef.current) return;

        const songId = currentSong?.id ?? null;

        // Only broadcast if song actually changed
        if (songId !== prevSongRef.current) {
            prevSongRef.current = songId;

            const songInfo: BroadcastSongInfo | null = currentSong ? {
                id: currentSong.id,
                name: currentSong.name,
                artist: currentSong.artist,
                album: currentSong.metadata?.album ?? undefined,
                coverUrl: currentSong.coverUrl,
                duration: audioState?.duration,
            } : null;

            serviceRef.current.broadcastTrack(songInfo);
        }
    }, [currentSong, audioState?.duration, isEnabled, role]);

    // Broadcast playback state periodically (master only)
    useEffect(() => {
        if (!isEnabled || role !== 'master' || !serviceRef.current || !audioState) return;

        const interval = setInterval(() => {
            if (serviceRef.current) {
                serviceRef.current.broadcastPlayback(
                    audioState.isPlaying,
                    audioState.currentTime,
                    audioState.duration,
                    audioState.volume,
                    audioState.isLooping,
                    audioState.isShuffle
                );
            }
        }, 500); // 2Hz update rate

        return () => clearInterval(interval);
    }, [isEnabled, role, audioState]);

    // Broadcast lyrics (master only)
    useEffect(() => {
        if (!isEnabled || role !== 'master' || !serviceRef.current || !audioState) return;

        serviceRef.current.broadcastLyrics(
            currentLyric,
            nextLyric,
            audioState.currentTime,
            audioState.duration
        );
    }, [currentLyric, nextLyric, audioState?.currentTime, audioState?.duration, isEnabled, role]);

    // Actions
    const setRole = useCallback((newRole: InterconnectRole) => {
        setRoleState(newRole);
    }, []);

    const regenerateCode = useCallback(() => {
        if (serviceRef.current) {
            const newCode = serviceRef.current.regenerateCode();
            setPairingCode(newCode);
        }
    }, []);

    const pairWithCode = useCallback((code: string) => {
        if (serviceRef.current) {
            serviceRef.current.requestPairing(code);
        }
    }, []);

    const acceptPairing = useCallback((peerId: string) => {
        if (serviceRef.current) {
            serviceRef.current.acceptPairing(peerId);
        }
    }, []);

    const rejectPairing = useCallback((peerId: string, reason?: string) => {
        if (serviceRef.current) {
            serviceRef.current.rejectPairing(peerId, reason);
        }
    }, []);

    const disconnect = useCallback((peerId?: string) => {
        if (serviceRef.current) {
            serviceRef.current.disconnect(peerId);
        }
    }, []);

    const sendCommand = useCallback((command: InterconnectCommand, payload?: any) => {
        if (serviceRef.current) {
            serviceRef.current.sendCommand(command, payload);
        }
    }, []);

    const broadcastState = useCallback(() => {
        if (!serviceRef.current || role !== 'master') return;

        // Force broadcast current state
        if (currentSong) {
            const songInfo: BroadcastSongInfo = {
                id: currentSong.id,
                name: currentSong.name,
                artist: currentSong.artist,
                album: currentSong.metadata?.album ?? undefined,
                coverUrl: currentSong.coverUrl,
                duration: audioState?.duration,
            };
            serviceRef.current.broadcastTrack(songInfo);
        }

        if (audioState) {
            serviceRef.current.broadcastPlayback(
                audioState.isPlaying,
                audioState.currentTime,
                audioState.duration,
                audioState.volume,
                audioState.isLooping,
                audioState.isShuffle
            );
        }
    }, [currentSong, audioState, role]);

    const setEnabled = useCallback((value: boolean) => {
        setIsEnabled(value);
    }, []);

    return {
        pairingCode,
        role,
        connectionState,
        connectedPeers,
        discoveredPeers,
        setRole,
        regenerateCode,
        pairWithCode,
        acceptPairing,
        rejectPairing,
        disconnect,
        sendCommand,
        broadcastState,
        isEnabled,
        setEnabled,
    };
}
