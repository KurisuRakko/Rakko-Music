
import { useState, useRef, useEffect, useCallback } from 'react';
import { Song, AudioState, AppSettings } from '../types';
import { extractAlbumArt } from '../utils';

export interface UsePlayerOptions {
    songs: Song[];
    settings: AppSettings;
    onSongChange?: (song: Song | null) => void;
}

export interface UsePlayerReturn {
    // State
    currentSong: Song | null;
    currentCover: string | null;
    audioState: AudioState;

    // Refs (for external sync like video)
    audioRef: React.RefObject<HTMLAudioElement>;
    videoRef: React.RefObject<HTMLVideoElement>;

    // Actions
    setCurrentSong: (song: Song | null) => void;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrev: () => void;
    handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSeekToTime: (time: number) => void;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
}

/**
 * usePlayer - Shared hook for audio playback logic
 * Used by both Desktop App and Mobile App
 */
export function usePlayer({ songs, settings, onSongChange }: UsePlayerOptions): UsePlayerReturn {
    const [currentSong, setCurrentSongInternal] = useState<Song | null>(null);
    const [currentCover, setCurrentCover] = useState<string | null>(null);

    const [audioState, setAudioState] = useState<AudioState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isLooping: false,
        isShuffle: false,
    });

    const audioRef = useRef<HTMLAudioElement>(new Audio());
    const videoRef = useRef<HTMLVideoElement>(null);
    const isRecoveringFromBackground = useRef(false);

    // Wrapper for setCurrentSong with callback
    const setCurrentSong = useCallback((song: Song | null) => {
        setCurrentSongInternal(song);
        onSongChange?.(song);
    }, [onSongChange]);

    // --- Audio Event Handlers ---
    const handleTimeUpdate = useCallback(() => {
        const currentTime = audioRef.current.currentTime;
        setAudioState(prev => ({ ...prev, currentTime }));

        // Sync Video if exists
        if (videoRef.current && currentSong?.videoUrl && !isRecoveringFromBackground.current) {
            const videoTime = videoRef.current.currentTime;
            const diff = videoTime - currentTime;

            if (Math.abs(diff) < 0.15) {
                if (videoRef.current.playbackRate !== 1) videoRef.current.playbackRate = 1;
            } else if (Math.abs(diff) > 1.0) {
                console.warn(`[Sync] Major drift (${diff.toFixed(2)}s). Hard seeking.`);
                videoRef.current.currentTime = currentTime;
                videoRef.current.playbackRate = 1;
            } else {
                const targetRate = diff > 0 ? 0.95 : 1.05;
                if (videoRef.current.playbackRate !== targetRate) {
                    videoRef.current.playbackRate = targetRate;
                }
            }
        }
    }, [currentSong]);

    const handleLoadedMetadata = useCallback(() => {
        setAudioState(prev => ({ ...prev, duration: audioRef.current.duration }));
        if (audioState.isPlaying) {
            audioRef.current.play().catch(e => console.error("Play error:", e));
        }
    }, [audioState.isPlaying]);

    const playNext = useCallback(() => {
        if (songs.length === 0) return;

        let nextIndex;
        const currentIndex = songs.findIndex(s => s.id === currentSong?.id);

        if (audioState.isShuffle) {
            nextIndex = Math.floor(Math.random() * songs.length);
        } else {
            nextIndex = (currentIndex + 1) % songs.length;
        }

        setCurrentSong(songs[nextIndex]);
    }, [songs, currentSong, audioState.isShuffle, setCurrentSong]);

    const playPrev = useCallback(() => {
        if (songs.length === 0) return;
        const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
        const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
        setCurrentSong(songs[prevIndex]);
    }, [songs, currentSong, setCurrentSong]);

    const handleEnded = useCallback(() => {
        if (audioState.isLooping) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
            }
        } else {
            playNext();
        }
    }, [audioState.isLooping, playNext]);

    // --- Setup Audio Listeners ---
    useEffect(() => {
        const audio = audioRef.current;
        audio.volume = audioState.volume;

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [handleEnded, handleTimeUpdate, handleLoadedMetadata, audioState.volume]);

    // --- Video Sync Effect ---
    useEffect(() => {
        if (videoRef.current) {
            if (audioState.isPlaying) {
                if (videoRef.current.paused) videoRef.current.play().catch(console.error);
            } else {
                if (!videoRef.current.paused) videoRef.current.pause();
            }
        }
    }, [audioState.isPlaying]);

    // --- Visibility Change Handler ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                }
            } else {
                if (videoRef.current && currentSong?.videoUrl && audioState.isPlaying) {
                    isRecoveringFromBackground.current = true;
                    videoRef.current.currentTime = audioRef.current.currentTime;
                    videoRef.current.play().catch(console.error);
                    setTimeout(() => { isRecoveringFromBackground.current = false; }, 1000);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [audioState.isPlaying, currentSong]);

    // --- Song Change Effect ---
    useEffect(() => {
        if (currentSong) {
            console.log("[usePlayer] Song Changed:", currentSong.name);
            audioRef.current.src = currentSong.url;
            audioRef.current.load();
            audioRef.current.play().then(() => {
                setAudioState(prev => ({ ...prev, isPlaying: true }));
            }).catch(err => {
                console.error("Playback failed", err);
                setAudioState(prev => ({ ...prev, isPlaying: false }));
            });

            // Extract Album Art
            extractAlbumArt(currentSong.file).then(cover => {
                setCurrentCover(cover);
            });
        } else {
            audioRef.current.pause();
            setAudioState(prev => ({ ...prev, isPlaying: false }));
            setCurrentCover(null);
        }
    }, [currentSong]);

    // --- Actions ---
    const togglePlayPause = useCallback(() => {
        if (!currentSong && songs.length > 0) {
            setCurrentSong(songs[0]);
            return;
        }

        if (audioState.isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
        setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }, [currentSong, songs, audioState.isPlaying, setCurrentSong]);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        audioRef.current.currentTime = time;
        if (videoRef.current) videoRef.current.currentTime = time;
        setAudioState(prev => ({ ...prev, currentTime: time }));
    }, []);

    const handleSeekToTime = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            if (videoRef.current) videoRef.current.currentTime = time;
            setAudioState(prev => ({ ...prev, currentTime: time }));
            if (!audioState.isPlaying) {
                audioRef.current.play().catch(console.error);
                setAudioState(prev => ({ ...prev, isPlaying: true }));
            }
        }
    }, [audioState.isPlaying]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value);
        audioRef.current.volume = vol;
        setAudioState(prev => ({ ...prev, volume: vol }));
    }, []);

    return {
        currentSong,
        currentCover,
        audioState,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
        videoRef,
        setCurrentSong,
        togglePlayPause,
        playNext,
        playPrev,
        handleSeek,
        handleSeekToTime,
        handleVolumeChange,
        setAudioState,
    };
}
