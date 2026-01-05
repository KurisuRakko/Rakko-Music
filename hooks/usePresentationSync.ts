import { useEffect, useCallback, useRef } from 'react';
import { AudioState, Song } from '../types';

const CHANNEL_NAME = 'rakko_music_sync';

export interface SyncPacket {
    type: 'SYNC' | 'REQUEST_SYNC';
    timestamp: number;
    payload?: {
        currentSong: Song | null;
        audioState: AudioState;
        currentCover: string | null;
    };
}

interface UsePresentationSyncProps {
    role: 'leader' | 'follower';
    state?: {
        currentSong: Song | null;
        audioState: AudioState;
        currentCover: string | null;
    };
    onSync?: (payload: NonNullable<SyncPacket['payload']>) => void;
}

export const usePresentationSync = ({ role, state, onSync }: UsePresentationSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);

        const handleMessage = (event: MessageEvent<SyncPacket>) => {
            const { type, payload } = event.data;

            if (role === 'follower') {
                if (type === 'SYNC' && payload && onSync) {
                    onSync(payload);
                }
            } else if (role === 'leader') {
                if (type === 'REQUEST_SYNC') {
                    // A new follower joined and asked for state, send it immediately
                    broadcastState();
                }
            }
        };

        channelRef.current.addEventListener('message', handleMessage);

        // If follower, request initial state on mount
        if (role === 'follower') {
            channelRef.current.postMessage({
                type: 'REQUEST_SYNC',
                timestamp: Date.now()
            } as SyncPacket);
        }

        return () => {
            channelRef.current?.removeEventListener('message', handleMessage);
            channelRef.current?.close();
        };
    }, [role]); // Intentionally exclude dependencies that change often to avoid recreating channel

    // Broadcast function for Leader
    const broadcastState = useCallback(() => {
        if (role !== 'leader' || !channelRef.current || !state) return;

        channelRef.current.postMessage({
            type: 'SYNC',
            timestamp: Date.now(),
            payload: state
        } as SyncPacket);
    }, [role, state]);

    // Automatically broadcast on state movement (throttling might be needed for high-frequency updates like currentTime)
    // For now, we trust React's effect system or the caller to call broadcast separately for high-frequency time updates
    useEffect(() => {
        if (role === 'leader') {
            broadcastState();
        }
    }, [role, state?.currentSong?.id, state?.audioState.isPlaying, state?.audioState.volume, state?.audioState.isLooping, state?.audioState.isShuffle]);


    // Special handling for time updates to avoid spamming?
    // Actually, for a "Presentation Mode" lyrics sync, we probably DO want frequent updates.
    // We can let the main loop inside App.tsx or usePresentationSync drive this.
    // Let's add a separate effect for time updates if it changes significantly? 
    // Or just rely on the parent component triggering a re-render/effect when state changes.

    // NOTE: In App.tsx `handleTimeUpdate` updates state very often. passing `state` here will cause this effect to fire often.
    // Is BroadcastChannel cheap enough? Yes, usually. But 60fps might be too much. 
    // Let's throttle it slightly? Or just let it fly for now. 
    // Optimization: Only broadcast time if it changed by > 0.5s or something?
    // Let's stick to the simpler `useEffect` above which covers ALL state changes including time.
    // If performance is bad, we can throttle `state.audioState.currentTime`.

    return { broadcastState };
};
