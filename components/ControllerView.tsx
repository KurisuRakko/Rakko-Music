
```
import React, { useRef, useEffect } from 'react';
import { Song, AudioState } from '../types';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Music2 } from 'lucide-react';
import { SyncCommand } from '../hooks/usePresentationSync';

interface ControllerViewProps {
    currentSong: Song | null;
    currentCover: string | null;
    audioState: AudioState | null;
    songs: Song[];
    sendCommand: (cmd: SyncCommand, payload?: any) => void;
    accentColor: string;
}

const ControllerView: React.FC<ControllerViewProps> = ({
    currentSong,
    currentCover,
    audioState,
    songs,
    sendCommand,
    accentColor
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active song
    useEffect(() => {
        if (currentSong && scrollRef.current) {
            const activeEl = document.getElementById(`ctrl - song - ${ currentSong.id } `);
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

    return (
        <div className="w-screen h-screen bg-[#09090b] text-white flex flex-col font-sans select-none overflow-hidden">
            {/* === HEADER === */}
            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-2 text-white/70">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_limegreen]" />
                    <span className="text-xs font-bold tracking-widest uppercase">Remote Connected</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => sendCommand('SET_SHUFFLE', !audioState.isShuffle)}
                        className={`p - 2 rounded - lg transition - all ${ audioState.isShuffle ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/70' } `}
                    >
                        <Shuffle size={16} />
                    </button>
                    <button
                        onClick={() => sendCommand('SET_LOOP', !audioState.isLooping)}
                        className={`p - 2 rounded - lg transition - all ${ audioState.isLooping ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/70' } `}
                    >
                        <Repeat size={16} />
                    </button>
                </div>
            </div>

            {/* === NOW PLAYING === */}
            <div className="p-6 flex flex-col items-center gap-6 border-b border-white/5 bg-gradient-to-b from-[#111] to-[#09090b]">
                {/* Large Art */}
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative group">
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
                    {/* Metadata Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                        <h2 className="text-xl font-bold truncate text-white drop-shadow-md">
                            {currentSong?.metadata?.title || currentSong?.name || "Not Playing"}
                        </h2>
                        <p className="text-sm text-white/60 truncate">
                            {currentSong?.metadata?.artists.join(', ') || currentSong?.artist || "..."}
                        </p>
                    </div>
                </div>

                {/* Progress */}
                <div className="w-full flex items-center gap-3">
                    <span className="text-xs text-white/30 font-mono w-10 text-right">
                        {Math.floor(audioState.currentTime / 60)}:{Math.floor(audioState.currentTime % 60).toString().padStart(2, '0')}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={audioState.duration || 100}
                        value={audioState.currentTime}
                        onChange={(e) => sendCommand('SEEK', Number(e.target.value))}
                        className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        style={{
                            background: `linear - gradient(to right, ${ accentColor } ${(audioState.currentTime / (audioState.duration || 1)) * 100}%, rgba(255, 255, 255, 0.1) 0)`
                        }}
                    />
                    <span className="text-xs text-white/30 font-mono w-10">
                        {Math.floor(audioState.duration / 60)}:{Math.floor(audioState.duration % 60).toString().padStart(2, '0')}
                    </span>
                </div>

                {/* Main Controls */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => sendCommand('PREV')}
                        className="p-4 rounded-full hover:bg-white/5 text-white/70 hover:text-white transition-all active:scale-95"
                    >
                        <SkipBack size={24} fill="currentColor" />
                    </button>
                    <button
                        onClick={() => sendCommand('TOGGLE_PLAY')}
                        className="p-5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        style={{ backgroundColor: accentColor, color: '#000' }}
                    >
                        {audioState.isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>
                    <button
                        onClick={() => sendCommand('NEXT')}
                        className="p-4 rounded-full hover:bg-white/5 text-white/70 hover:text-white transition-all active:scale-95"
                    >
                        <SkipForward size={24} fill="currentColor" />
                    </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3 w-full max-w-xs">
                    <Volume2 size={16} className="text-white/40" />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={audioState.volume}
                        onChange={(e) => sendCommand('SET_VOLUME', Number(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
                    />
                </div>
            </div>

            {/* === PLAYLIST === */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 pl-2">Up Next</h3>
                {songs.map((song, idx) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                        <div
                            key={song.id}
                            id={`ctrl - song - ${ song.id } `}
                            onClick={() => sendCommand('PLAY_SONG', song)}
                            className={`group flex items - center gap - 3 p - 3 rounded - xl transition - all cursor - pointer ${ isCurrent ? 'bg-white/10 border border-white/5' : 'hover:bg-white/5 border border-transparent' } `}
                        >
                            <div className={`w - 10 h - 10 rounded - lg flex items - center justify - center ${ isCurrent ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10' } `}>
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
                            <div className="flex-1 min-w-0">
                                <div className={`font - medium truncate ${ isCurrent ? 'text-white' : 'text-white/80' } `}>
                                    {song.metadata?.title || song.name}
                                </div>
                                <div className="text-xs text-white/40 truncate">
                                    {song.metadata?.artists.join(', ') || song.artist}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ControllerView;
