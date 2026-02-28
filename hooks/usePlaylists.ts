
import { useState, useEffect, useCallback } from 'react';
import { Playlist } from '../types';

const PLAYLISTS_STORAGE_KEY = 'rakko_playlists';

export const usePlaylists = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    // Load playlists on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
            if (saved) {
                setPlaylists(JSON.parse(saved));
            }
        } catch (e) {
            console.error('[usePlaylists] Failed to load playlists:', e);
        }
    }, []);

    // Save playlists when they change
    useEffect(() => {
        localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    }, [playlists]);

    const createPlaylist = useCallback((name: string) => {
        const newPlaylist: Playlist = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim() || 'New Playlist',
            songIds: [],
            createdAt: Date.now(),
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        return newPlaylist;
    }, []);

    const deletePlaylist = useCallback((id: string) => {
        setPlaylists(prev => prev.filter(p => p.id !== id));
    }, []);

    const renamePlaylist = useCallback((id: string, newName: string) => {
        setPlaylists(prev => prev.map(p =>
            p.id === id ? { ...p, name: newName.trim() } : p
        ));
    }, []);

    const addSongToPlaylist = useCallback((playlistId: string, songId: string) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId && !p.songIds.includes(songId)) {
                return { ...p, songIds: [...p.songIds, songId] };
            }
            return p;
        }));
    }, []);

    const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId) {
                return { ...p, songIds: p.songIds.filter(id => id !== songId) };
            }
            return p;
        }));
    }, []);

    const toggleSongInPlaylist = useCallback((playlistId: string, songId: string) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId) {
                if (p.songIds.includes(songId)) {
                    return { ...p, songIds: p.songIds.filter(id => id !== songId) };
                } else {
                    return { ...p, songIds: [...p.songIds, songId] };
                }
            }
            return p;
        }));
    }, []);

    const reorderPlaylist = useCallback((playlistId: string, sourceIndex: number, destinationIndex: number) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId) {
                const newIds = [...p.songIds];
                const [movedId] = newIds.splice(sourceIndex, 1);
                newIds.splice(destinationIndex, 0, movedId);
                return { ...p, songIds: newIds };
            }
            return p;
        }));
    }, []);

    return {
        playlists,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleSongInPlaylist,
        reorderPlaylist
    };
};
