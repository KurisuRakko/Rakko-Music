import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { AudioState } from '../types';

interface ControlsProps {
  audioState: AudioState;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleLoop: () => void;
  onToggleShuffle: () => void;
  formatTime: (s: number) => string;
  accentColor: string;
}

const Controls: React.FC<ControlsProps> = ({
  audioState,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleLoop,
  onToggleShuffle,
  formatTime,
  accentColor
}) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto z-20">
      
      {/* Progress Bar */}
      <div className="group flex flex-col gap-2 w-full">
        <input
          type="range"
          min={0}
          max={audioState.duration || 0}
          value={audioState.currentTime}
          onChange={onSeek}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer hover:h-1.5 transition-all"
          style={{
            backgroundSize: `${(audioState.currentTime / audioState.duration) * 100}% 100%`,
            backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`,
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="flex justify-between text-[10px] font-medium text-white/40 group-hover:text-white/70 transition-colors px-1">
          <span>{formatTime(audioState.currentTime)}</span>
          <span>{formatTime(audioState.duration)}</span>
        </div>
      </div>

      {/* Main Buttons Row */}
      <div className="flex items-center justify-between">
        
        {/* Shuffle / Loop */}
        <div className="flex items-center gap-4">
           <button 
            onClick={onToggleShuffle}
            className={`transition-all hover:scale-110 ${!audioState.isShuffle ? 'text-white/30 hover:text-white' : ''}`}
            style={{ color: audioState.isShuffle ? accentColor : undefined }}
          >
            <Shuffle size={18} />
          </button>
          <button 
            onClick={onToggleLoop}
            className={`transition-all hover:scale-110 ${!audioState.isLooping ? 'text-white/30 hover:text-white' : ''}`}
            style={{ color: audioState.isLooping ? accentColor : undefined }}
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-8">
          <button 
            onClick={onPrev}
            className="text-white transition-transform active:scale-90 hover:opacity-80"
            style={{ '--hover-color': accentColor } as React.CSSProperties}
          >
            <SkipBack size={28} fill="currentColor" className="opacity-80" />
          </button>
          
          <button 
            onClick={onPlayPause}
            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {audioState.isPlaying ? (
              <Pause size={32} fill="currentColor" />
            ) : (
              <Play size={32} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button 
            onClick={onNext}
            className="text-white transition-transform active:scale-90 hover:opacity-80"
          >
            <SkipForward size={28} fill="currentColor" className="opacity-80" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 group w-24 justify-end">
           <button className="text-white/40 group-hover:text-white transition-colors">
             {audioState.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
           </button>
           <div className="w-16 overflow-hidden">
             <input
               type="range"
               min={0}
               max={1}
               step={0.01}
               value={audioState.volume}
               onChange={onVolumeChange}
               className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
             />
           </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;