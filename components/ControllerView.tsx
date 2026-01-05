
import React, { useRef, useEffect, useState } from 'react';
import { Song, AudioState } from '../types';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Volume1, VolumeX, Music2, ChevronUp, ChevronDown } from 'lucide-react';
import { SyncCommand } from '../hooks/usePresentationSync';
import { CustomSlider } from './ui/CustomSlider';

interface ControllerViewProps {
    currentSong: Song | null;
    currentCover: string | null;
    audioState: AudioState | null;
    songs: Song[];
    sendPing: () => void;
    lastPongTime: number;
}

const ControllerView: React.FC<ControllerViewProps> = ({
    currentSong,
    currentCover,
    audioState,
    songs,
    sendCommand,
    accentColor,
    lastSyncTime,
    lastPongTime,
    settings,
    sendPing
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [isPinging, setIsPinging] = useState(false);

    // Update time every second to check connection status
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Reset pinging state when Pong is received
    useEffect(() => {
        setIsPinging(false);
    }, [lastPongTime]);

    // Auto-scroll to active song
    useEffect(() => {
        if (currentSong && scrollRef.current) {
            const activeEl = document.getElementById(`ctrl-song-${currentSong.id}`);
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentSong?.id]);

    if (!audioState) {
        return (
            <div className="w-screen h-screen bg-black flex items-center justify-center text-white/50 animate-pulse">
                Connecting to Player...
            </div>
        );
    }

    const isConnected = (currentTime - lastSyncTime) < 10000;

    // Ping Logic
    const handlePing = () => {
        setIsPinging(true);
        sendPing();
    };

    const getStatusText = () => {
        if (isPinging) return "Pinging...";
        if (lastPongTime > 0 && (currentTime - lastPongTime) < 3000) return "Connected";
        if (isConnected) return "Online";
        return "Offline";
    };

    const statusText = getStatusText();
    const statusColor = statusText === "Connected" ? "text-green-400" : (statusText === "Online" ? "text-blue-400" : (statusText === "Pinging..." ? "text-yellow-400" : "text-red-400"));

    return (
        <div className="w-screen h-screen bg-[#09090b] text-white flex flex-col font-sans select-none overflow-hidden relative">

            {/* === HEADER === */}
            <div className={`
                p-4 border-b border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md sticky top-0 z-20 
            `}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePing}
                        className={`
                            px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 
                            text-xs font-bold tracking-wide transition-all active:scale-95
                            flex items-center gap-2
                        `}
                    >
                        <div className={`w-2 h-2 rounded-full ${statusText === 'Offline' ? 'bg-red-500' : 'bg-green-500'} ${isPinging ? 'animate-ping' : ''}`} />
                        PING
                    </button>
                    <span className={`text-xs font-mono font-bold ${statusColor} transition-colors duration-300`}>
                        {statusText}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => sendCommand('SET_SHUFFLE', !audioState.isShuffle)}
                        className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 ease-spring ${audioState.isShuffle ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/70'}`}
                        style={{ color: audioState.isShuffle ? accentColor : undefined }}
                    >
                        <Shuffle size={16} />
                    </button>
                    <button
                        onClick={() => sendCommand('SET_LOOP', !audioState.isLooping)}
                        className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 ease-spring ${audioState.isLooping ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/70'}`}
                        style={{ color: audioState.isLooping ? accentColor : undefined }}
                    >
                        <Repeat size={16} />
                    </button>
                </div>
            </div>

            {/* === NOW PLAYING === */}
            <div className={`
                p-6 flex flex-col items-center gap-6 border-b border-white/5 bg-gradient-to-b from-[#111] to-[#09090b] relative z-10
            `}>
                {/* Large Art */}
                <div className={`
                    rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative group transition-all duration-1000
                    w-48 h-48 sm:w-64 sm:h-64 shrink-0
                `}>
                    {currentSong ? (
                        <img src={currentCover || undefined}
                            alt="Album Art"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Music2 size={48} className="opacity-20" />
                        </div>
                    )}
                </div>

                {/* Metadata - Full Display, No Truncation */}
                <div className="w-full flex flex-col items-center text-center gap-1">
                    <h2 className="text-xl font-bold text-white drop-shadow-md whitespace-normal break-words leading-tight">
                        {currentSong?.metadata?.title || currentSong?.name || "Not Playing"}
                    </h2>
                    <p className="text-sm text-white/60 whitespace-normal break-words leading-snug">
                        {currentSong?.metadata?.artists.join(', ') || currentSong?.artist || "..."}
                    </p>
                </div>

                {/* Controls Container */}
                <div className={`
                    w-full flex flex-col items-center gap-6 transition-all duration-1000 ease-in-out
                `}>
                    {/* Progress */}
                    <div className="w-full flex items-center gap-3">
                        <span className="text-xs text-white/30 font-mono w-10 text-right">
                            {Math.floor(audioState.currentTime / 60)}:{Math.floor(audioState.currentTime % 60).toString().padStart(2, '0')}
                        </span>
                        <div className="flex-1">
                            <CustomSlider
                                value={audioState.currentTime}
                                max={audioState.duration || 100}
                                onChange={(e) => sendCommand('SEEK', Number(e.target.value))}
                                accentColor={accentColor}
                                tooltipFormatter={(val) => `${Math.floor(val / 60)}:${Math.floor(val % 60).toString().padStart(2, '0')}`}
                            />
                        </div>
                        <span className="text-xs text-white/30 font-mono w-10">
                            {Math.floor(audioState.duration / 60)}:{Math.floor(audioState.duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => sendCommand('PREV')}
                            className="text-white transition-all duration-300 active:scale-75 hover:scale-110 hover:opacity-80 hover:-translate-x-1 ease-spring"
                        >
                            <SkipBack size={32} fill="currentColor" className="opacity-80" />
                        </button>
                        <button
                            onClick={() => sendCommand('TOGGLE_PLAY')}
                            className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.3)] ease-spring"
                            style={{ backgroundColor: accentColor, color: '#000' }}
                        >
                            {audioState.isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
                        </button>
                        <button
                            onClick={() => sendCommand('NEXT')}
                            className="text-white transition-all duration-300 active:scale-75 hover:scale-110 hover:opacity-80 hover:translate-x-1 ease-spring"
                        >
                            <SkipForward size={32} fill="currentColor" className="opacity-80" />
                        </button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-3 w-full max-w-xs group">
                        <button
                            onClick={() => {
                                const newVol = audioState.volume > 0 ? 0 : 0.5;
                                sendCommand('SET_VOLUME', newVol);
                            }}
                            className="text-white/40 group-hover:text-white transition-colors active:scale-90 ease-spring"
                        >
                            {audioState.volume === 0 ? <VolumeX size={20} /> : audioState.volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                        </button>
                        <div className="flex-1">
                            <CustomSlider
                                value={audioState.volume}
                                max={1}
                                step={0.05}
                                onChange={(e) => sendCommand('SET_VOLUME', Number(e.target.value))}
                                accentColor={accentColor}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* === PLAYLIST === */}
            <div className={`
                flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar transition-all duration-1000
                opacity-100 translate-y-0
            `}>
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 pl-2">Up Next</h3>
                {songs.map((song, idx) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                        <div
                            key={song.id}
                            id={`ctrl-song-${song.id}`}
                            className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? 'bg-white/10 border border-white/5' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            {/* Number / Playing Indicator */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                {isCurrent && audioState.isPlaying ? (
                                    <div className="flex gap-0.5 items-end h-3">
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite]" />
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.1s]" />
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]" />
                                    </div>
                                ) : (
                                    <span className="text-xs font-mono text-white/30">{idx + 1}</span>
                                )}
                            </div>

                            {/* Song Data */}
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                                    {song.metadata?.title || song.name}
                                </div>
                                <div className="text-xs text-white/40 truncate">
                                    {song.metadata?.artists.join(', ') || song.artist}
                                </div>
                            </div>

                            {/* Reorder Controls */}
                            <div className="flex bg-white/5 rounded-lg overflow-hidden flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    disabled={idx === 0}
                                    onClick={() => sendCommand('REORDER_SONGS', { from: idx, to: idx - 1 })}
                                    className="p-1 hover:bg-white/20 disabled:opacity-20"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                <button
                                    disabled={idx === songs.length - 1}
                                    onClick={() => sendCommand('REORDER_SONGS', { from: idx, to: idx + 1 })}
                                    className="p-1 hover:bg-white/20 disabled:opacity-20"
                                >
                                    <ChevronDown size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ControllerView;
