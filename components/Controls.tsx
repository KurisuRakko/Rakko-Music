import React, { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Volume1 } from 'lucide-react';
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

import { CustomSlider } from './ui/CustomSlider';

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
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto z-20 px-2">

      {/* Progress Bar Area */}
      <div className="flex flex-col gap-1 w-full group">
        <CustomSlider
          value={audioState.currentTime}
          max={audioState.duration || 100} // Prevent divide by zero
          onChange={onSeek}
          accentColor={accentColor}
          tooltipFormatter={formatTime}
        />
        <div className="flex justify-between text-[10px] font-medium text-white/30 group-hover:text-white/60 transition-colors duration-300 px-1">
          <span>{formatTime(audioState.currentTime)}</span>
          <span>{formatTime(audioState.duration)}</span>
        </div>
      </div>

      {/* Main Buttons Row */}
      <div className="flex items-center justify-between">

        {/* Shuffle / Loop (Animation Spot #3: Icon Hover) */}
        <div className="flex items-center gap-5">
          <button
            onClick={onToggleShuffle}
            className={`transition-all duration-300 hover:scale-110 active:scale-95 ease-spring ${!audioState.isShuffle ? 'text-white/30 hover:text-white' : ''}`}
            style={{ color: audioState.isShuffle ? accentColor : undefined }}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={onToggleLoop}
            className={`transition-all duration-300 hover:scale-110 active:scale-95 ease-spring ${!audioState.isLooping ? 'text-white/30 hover:text-white' : ''}`}
            style={{ color: audioState.isLooping ? accentColor : undefined }}
            title="Loop"
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Playback Controls (Animation Spot #4: Spring Buttons) */}
        <div className="flex items-center gap-8">
          <button
            onClick={onPrev}
            className="text-white transition-all duration-300 active:scale-75 hover:scale-110 hover:opacity-80 hover:-translate-x-1 ease-spring"
          >
            <SkipBack size={28} fill="currentColor" className="opacity-80" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-500 ease-spring shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)]"
          >
            {audioState.isPlaying ? (
              <Pause size={30} fill="currentColor" />
            ) : (
              <Play size={30} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-white transition-all duration-300 active:scale-75 hover:scale-110 hover:opacity-80 hover:translate-x-1 ease-spring"
          >
            <SkipForward size={28} fill="currentColor" className="opacity-80" />
          </button>
        </div>

        {/* Volume (Animation Spot #5: Reveal Slider) */}
        <div className="flex items-center gap-3 group w-28 justify-end transition-all duration-300 hover:w-36">
          <button
            className="text-white/40 group-hover:text-white transition-colors active:scale-90 ease-spring"
            onClick={() => {
              // Toggle mute logic if needed, passing simple mock event
              const newVol = audioState.volume > 0 ? 0 : 0.5;
              onVolumeChange({ target: { value: newVol } } as any);
            }}
          >
            {audioState.volume === 0 ? <VolumeX size={18} /> : audioState.volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="flex-1">
            <CustomSlider
              value={audioState.volume}
              max={1}
              onChange={onVolumeChange}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;