
import { useEffect, useRef, useState, useCallback } from 'react';
import { Song, AudioState } from '../types';

// --- Types ---

export type SyncRole = 'player' | 'controller';

export type SyncMessage =
    | { type: 'STATE_UPDATE'; payload: SyncStatePayload }
    | { type: 'COMMAND'; command: SyncCommand; payload?: any; sourceId?: string }
    | { type: 'REQUEST_INIT' };

export interface SyncStatePayload {
    currentSong: Song | null;
    currentCover: string | null;
    audioState: AudioState;
    songs: Song[];
    timestamp: number;
}

export type SyncCommand =
    | 'PLAY'
    | 'PAUSE'
    | 'TOGGLE_PLAY'
    | 'NEXT'
    | 'PREV'
    | 'SEEK'
    | 'SET_VOLUME'
    | 'SET_LOOP'
    | 'SET_SHUFFLE'
    | 'PLAY_SONG';

interface UsePresentationSyncProps {
    role: SyncRole;
    // Player-only inputs (source of truth)
    currentSong?: Song | null;
    currentCover?: string | null;
    audioState?: AudioState;
    songs?: Song[];
    // Player-only handlers (to execute commands)
    onPlay?: () => void;
    onPause?: () => void;
    onTogglePlay?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (time: number) => void;
    onSetVolume?: (vol: number) => void;
    onSetLoop?: (loop: boolean) => void;
    onSetShuffle?: (shuffle: boolean) => void;
    onPlaySong?: (song: Song) => void;
}

export const usePresentationSync = ({
    role,
    currentSong,
    currentCover,
    audioState,
    songs,
    onPlay,
    onPause,
    onTogglePlay,
    onNext,
    onPrev,
    onSeek,
    onSetVolume,
    onSetLoop,
    onSetShuffle,
    onPlaySong
}: UsePresentationSyncProps) => {

    // --- State for Controller ---
    const [syncedSong, setSyncedSong] = useState<Song | null>(null);
    const [syncedCover, setSyncedCover] = useState<string | null>(null);
    const [syncedAudioState, setSyncedAudioState] = useState<AudioState | null>(null);
    const [syncedSongs, setSyncedSongs] = useState<Song[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState<number>(0);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const lastStateRef = useRef<string>("");

    // --- Initialize Channel ---
    useEffect(() => {
        const channel = new BroadcastChannel('rakko_music_sync');
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;

            if (role === 'controller') {
                if (msg.type === 'STATE_UPDATE') {
                    setSyncedSong(msg.payload.currentSong);
                    setSyncedCover(msg.payload.currentCover);
                    setSyncedAudioState(msg.payload.audioState);
                    // Only update songs if changed (check length or hash if feasible, simple length/id check for now)
                    // For optimization, we rely on React's diffing, but could avoid setting if identical.
                    setSyncedSongs(msg.payload.songs);
                    setLastSyncTime(msg.payload.timestamp);
                }
            } else if (role === 'player') {
                if (msg.type === 'REQUEST_INIT') {
                    // Force send state immediately
                    broadcastState(true);
                } else if (msg.type === 'COMMAND') {
                    executeCommand(msg.command, msg.payload);
                }
            }
        };

        channel.onmessage = handleMessage;

        if (role === 'controller') {
            // Request initial state on mount
            channel.postMessage({ type: 'REQUEST_INIT' });
        }

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [role]);

    // --- Player Logic: Broadcast State ---
    const broadcastState = useCallback((force = false) => {
        if (role !== 'player' || !channelRef.current) return;
        if (!currentSong && !audioState) return;

        // Create payload
        const payload: SyncStatePayload = {
            currentSong: currentSong || null,
            currentCover: currentCover || null,
            audioState: audioState || { isPlaying: false, currentTime: 0, duration: 0, volume: 1, isLooping: false, isShuffle: false },
            // To reduce bandwidth, we could just send IDs, but for Demo Mode (local), full objects are fine.
            songs: songs || [],
            timestamp: Date.now()
        };

        // Simple diffing to prevent spamming identical states (especially loops)
        // We ignore timestamp for diffing
        const stateSig = JSON.stringify({
            id: currentSong?.id,
            state: { ...audioState, currentTime: Math.floor(audioState?.currentTime || 0) }, // Round time to second to reduce checks? No, we want smooth slider.
            // Actually, for currentTime, we might want to throttle updates in the loop instead of here.
            // But here we just check if significant change occurred.
        });

        // If we rely on parent to pass changed props, we might just broadcast whenever props change.
        // However, fast time updates will cause many renders.
        // We will throttle broadcasts in a useEffect derived from props.

        // NOTE: Sending full songs array every time frame is BAD if list is huge.
        // Optimization: Send songs only if list length changes or ID checksum changes.
        // For MVP/Demo with <100 songs, it's acceptable. For production, separate PLAYLIST_UPDATE message.

        channelRef.current.postMessage({ type: 'STATE_UPDATE', payload });
    }, [role, currentSong, currentCover, audioState, songs]);

    // --- Throttle Broadcasts ---
    useEffect(() => {
        if (role !== 'player') return;

        const now = Date.now();
        // Use a ref to throttle? 
        // Actually, React batching might already help, but `timeupdate` fires fast.
        // Let's rely on the fact that `audioState.currentTime` changes frequently.

        const handler = setTimeout(() => {
            broadcastState();
        }, 100); // 10Hz sync rate is plenty for smooth Seek Bar in remote

        return () => clearTimeout(handler);
    }, [role, audioState, currentSong, currentCover, songs, broadcastState]);


    // --- Refs for Handlers (to avoid stale closures in useEffect) ---
    const handlersRef = useRef({
        onPlay, onPause, onTogglePlay, onNext, onPrev,
        onSeek, onSetVolume, onSetLoop, onSetShuffle, onPlaySong
    });

    // Update refs on every render
    useEffect(() => {
        handlersRef.current = {
            onPlay, onPause, onTogglePlay, onNext, onPrev,
            onSeek, onSetVolume, onSetLoop, onSetShuffle, onPlaySong
        };
    });

    // --- Player Logic: Execute Commands ---
    const executeCommand = (cmd: SyncCommand, payload?: any) => {
        const handlers = handlersRef.current;
        console.log(`[PresentationSync] Executing command: ${cmd}`, payload);
        switch (cmd) {
            case 'PLAY': handlers.onPlay?.(); break;
            case 'PAUSE': handlers.onPause?.(); break;
            case 'TOGGLE_PLAY':
                console.log("[PresentationSync] Calling onTogglePlay");
                handlers.onTogglePlay?.();
                break;
            case 'NEXT':
                console.log("[PresentationSync] Calling onNext");
                handlers.onNext?.();
                break;
            case 'PREV':
                console.log("[PresentationSync] Calling onPrev");
                handlers.onPrev?.();
                break;
            case 'SEEK': handlers.onSeek?.(payload); break;
            case 'SET_VOLUME': handlers.onSetVolume?.(payload); break;
            case 'SET_LOOP': handlers.onSetLoop?.(payload); break;
            case 'SET_SHUFFLE': handlers.onSetShuffle?.(payload); break;
            case 'PLAY_SONG': handlers.onPlaySong?.(payload); break;
        }
    };

    // --- Controller Logic: Send Commands ---
    const sendCommand = (cmd: SyncCommand, payload?: any) => {
        if (role !== 'controller' || !channelRef.current) return;
        channelRef.current.postMessage({
            type: 'COMMAND',
            command: cmd,
            payload,
            sourceId: 'controller-' + Math.random().toString(36).substr(2, 5)
        });
    };

    return {
        // Controller Data
        syncedSong,
        syncedCover,
        syncedAudioState,
        syncedSongs,
        lastSyncTime,
        // Controller Actions
        sendCommand
    };
};