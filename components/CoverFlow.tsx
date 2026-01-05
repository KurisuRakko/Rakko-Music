
import React, { useEffect, useState, useRef } from 'react';
import { Song } from '../types';
import { extractAlbumArt } from '../utils';
import { Music2, Disc } from 'lucide-react';

interface CoverFlowProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onSelect: (song: Song) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  accentColor: string;
  showBackground: boolean;
  performanceMode?: boolean;
}

const COVER_SIZE = 360; 
const SPACING = 240;
const VISIBLE_RANGE = 6; 

const CoverCard = ({ 
  song, 
  isActive, 
  loadCover, 
  color,
  isPlaying,
  performanceMode
}: { 
  song: Song; 
  isActive: boolean; 
  loadCover: boolean;
  color: string;
  isPlaying: boolean;
  performanceMode: boolean;
}) => {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (loadCover && !cover) {
      extractAlbumArt(song.file).then(art => {
        if (mounted) setCover(art);
      });
    }
    return () => { mounted = false; };
  }, [song, loadCover, cover]);

  return (
    <div className="w-full h-full relative group preserve-3d">
      {/* Main Card */}
      <div 
        className={`
          w-full h-full rounded-xl overflow-hidden border transition-all duration-500 ease-out relative z-10
          ${isActive ? 'border-white/40 ring-1 ring-white/20' : 'border-white/5'}
        `}
        style={{ 
          backgroundColor: '#1a1a1a',
          boxShadow: !performanceMode && isActive ? `0 25px 80px -10px ${color}50` : performanceMode ? 'none' : '0 15px 40px -5px rgba(0,0,0,0.6)',
          // Apply grayscale and dimming when paused and active
          filter: isActive && !isPlaying && !performanceMode ? 'grayscale(100%) brightness(0.6)' : 'none'
        }}
      >
        {cover ? (
          <img src={cover} alt={song.name} className="w-full h-full object-cover select-none pointer-events-none" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-8 text-center bg-gradient-to-br from-white/10 to-black/40 select-none">
             <div className="mb-4 opacity-30">
               <Music2 size={64} />
             </div>
             <span className="text-sm text-white/50 font-bold truncate w-full">{song.metadata?.title || song.name}</span>
             <span className="text-xs text-white/30 truncate w-full mt-1">{song.metadata?.artists[0] || song.artist}</span>
          </div>
        )}
        
        {/* Gloss/Shine Effect */}
        {!performanceMode && (
           <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>

      {/* Reflection - HIDDEN IN PERFORMANCE MODE */}
      {!performanceMode && (
        <div 
            className="absolute top-full left-0 w-full h-full mt-2 rounded-xl overflow-hidden opacity-40 pointer-events-none"
            style={{ 
                transform: 'scaleY(-1)', 
                maskImage: 'linear-gradient(to bottom, transparent, transparent 5%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)', 
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                filter: isActive && !isPlaying ? 'grayscale(100%) brightness(0.6)' : 'none'
            }}
        >
            {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover blur-[1px]" />
            ) : (
            <div className="w-full h-full bg-white/5 blur-[1px]" />
            )}
        </div>
      )}
    </div>
  );
};

const CoverFlow: React.FC<CoverFlowProps> = ({ 
  songs, 
  currentSong, 
  isPlaying,
  onSelect, 
  onPlayPause,
  onNext,
  onPrev,
  onClose,
  accentColor,
  showBackground,
  performanceMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Drag / Gesture State
  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const hasDragged = useRef(false);

  // Sync with currentSong prop
  useEffect(() => {
    if (currentSong) {
      const idx = songs.findIndex(s => s.id === currentSong.id);
      if (idx !== -1) setInternalIndex(idx);
    }
  }, [currentSong, songs]);

  // Entrance Animation Trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle Wheel Scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 10 || Math.abs(e.deltaY) > 10) {
       const direction = Math.sign(e.deltaX + e.deltaY);
       const newIndex = Math.min(Math.max(internalIndex + direction, 0), songs.length - 1);
       if (newIndex !== internalIndex) {
         setInternalIndex(newIndex);
         onSelect(songs[newIndex]);
       }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        onPlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose, onPlayPause]);

  // --- Pointer Gestures (Drag/Swipe) ---

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    hasDragged.current = false;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const diff = e.clientX - startX.current;
    
    // Threshold to consider it a drag vs a messy click
    if (Math.abs(diff) > 5) {
      hasDragged.current = true;
    }
    
    // Visually drag 
    setDragOffset(diff);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);

    // If dragged significantly, switch songs
    if (Math.abs(dragOffset) > 80) {
       if (dragOffset > 0) {
         onPrev();
       } else {
         onNext();
       }
    }
    
    // Reset offset (let CSS transition handle smooth snap back)
    setDragOffset(0);
  };

  const handleCardClick = (e: React.MouseEvent, index: number, song: Song) => {
    e.stopPropagation();
    // If we just dragged, ignore the click
    if (hasDragged.current) return;

    if (index === internalIndex) {
      // Toggle Play/Pause if active
      onPlayPause();
    } else {
      // Select if not active
      setInternalIndex(index);
      onSelect(song);
    }
  };


  const getStyle = (index: number) => {
    const offset = index - internalIndex;
    const absOffset = Math.abs(offset);
    
    // Visibility optimization
    if (absOffset > VISIBLE_RANGE) return { display: 'none' };

    const isActive = offset === 0;
    
    // Calculate Spacing + Drag Impact
    const spacingValue = SPACING * (window.innerWidth < 768 ? 0.65 : 1);
    const translateX = (offset * spacingValue) + dragOffset;
    
    const translateZ = absOffset * -280; 
    
    const rotateY = offset === 0 ? 0 : offset > 0 ? -55 : 55;
    
    const zIndex = 1000 - absOffset;
    
    // Entrance Animation calculation
    const isReady = isMounted;
    const entranceOffset = isReady ? 0 : 600;
    const opacity = isActive ? 1 : Math.max(0.3, 1 - (absOffset * 0.25));

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) translateY(${entranceOffset}px)`,
      zIndex,
      opacity: isReady ? opacity : 0,
      transition: isDragging.current 
         ? 'none' // No transition while dragging for instant response
         : `transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease-out`,
      transitionDelay: isReady ? '0ms' : `${absOffset * 60}ms`
    };
  };

  const activeSong = songs[internalIndex];

  return (
    <div 
      className={`fixed inset-0 z-[100] w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-700 animate-fade-in touch-none ${showBackground ? 'bg-black/30 backdrop-blur-sm' : 'bg-[#080808] backdrop-blur-none'}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // Safety cancel
      ref={containerRef}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* Main 3D Stage */}
      <div 
        className="relative w-full flex-1 flex items-center justify-center pointer-events-none" // Cards have pointer-events-auto
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        {songs.map((song, i) => {
          const isActive = i === internalIndex;
          const offset = i - internalIndex;
          return (
            <div
              key={song.id}
              onClick={(e) => handleCardClick(e, i, song)}
              className="absolute top-1/2 left-1/2 cursor-pointer pointer-events-auto"
              style={{
                width: COVER_SIZE,
                height: COVER_SIZE,
                marginTop: -COVER_SIZE / 2,
                marginLeft: -COVER_SIZE / 2,
                ...getStyle(i)
              }}
            >
              <CoverCard 
                song={song} 
                isActive={isActive} 
                loadCover={Math.abs(offset) <= VISIBLE_RANGE} 
                color={accentColor}
                isPlaying={isPlaying}
                performanceMode={performanceMode}
              />
            </div>
          );
        })}

        {songs.length === 0 && (
          <div className="flex flex-col items-center text-white/40 gap-4 animate-pulse">
             <Disc size={48} />
             <p>Add songs to view PrismFlow</p>
          </div>
        )}
      </div>

      {/* Song Title (No Controls) */}
      <div className={`
          relative z-[110] w-full max-w-2xl pb-12 px-8 flex flex-col items-center text-center gap-2 transition-all duration-700 delay-300 pointer-events-none
          ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}
      `}>
         {activeSong && (
           <div className={`space-y-2 ${!performanceMode ? 'drop-shadow-2xl' : ''}`}>
             <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                {activeSong.metadata?.title || activeSong.name}
             </h2>
             <div className="flex items-center justify-center gap-3">
                <span className="text-xl md:text-2xl text-white/70 font-medium">
                    {activeSong.metadata?.artists.join(', ') || activeSong.artist}
                </span>
                {activeSong.metadata?.features && activeSong.metadata.features.length > 0 && (
                    <span className="text-white/40 text-lg">ft. {activeSong.metadata.features.join(', ')}</span>
                )}
             </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default CoverFlow;