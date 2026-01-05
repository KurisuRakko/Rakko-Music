import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Song } from '../types';
import { extractAlbumArt } from '../utils';
import { Music2, Disc } from 'lucide-react';

interface ShelfViewProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onSelect: (song: Song) => void;
  onClose: () => void;
  accentColor: string;
  performanceMode?: boolean;
}

const COVER_SIZE = 180;
const GAP = 40;
// Constants matching CoverFlow.tsx exactly to ensure seamless visual transition
const ARC_COVER_SIZE = 360;
const ARC_SPACING = 240;

const ShelfItem = ({
  song,
  index,
  isActive,
  isPlaying,
  accentColor,
  style,
  onClick,
  performanceMode
}: {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  accentColor: string;
  style: React.CSSProperties;
  onClick: () => void;
  performanceMode: boolean;
}) => {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    extractAlbumArt(song.file).then(art => {
      if (mounted) setCover(art);
    });
    return () => { mounted = false; };
  }, [song]);

  return (
    <div
      onClick={onClick}
      className="absolute cursor-pointer origin-center"
      style={{
        ...style,
        transition: performanceMode ? 'transform 0.3s ease, opacity 0.3s ease' : 'transform 0.7s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.7s cubic-bezier(0.25, 0.8, 0.25, 1), height 0.7s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.5s ease-out',
      }}
    >
      <div
        className={`
          w-full h-full rounded-xl overflow-hidden relative group
          ${isActive ? 'ring-2 ring-white/60 z-50' : 'hover:scale-105 hover:ring-1 hover:ring-white/20 z-10'}
        `}
        style={{
          boxShadow: !performanceMode && isActive ? `0 10px 40px -5px ${accentColor}60` : performanceMode ? 'none' : '0 10px 20px -5px rgba(0,0,0,0.5)',
          backgroundColor: '#1a1a1a',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, filter 0.5s ease',
          // Optional: match CoverFlow dimming
          filter: isActive && !isPlaying && !performanceMode ? 'grayscale(100%) brightness(0.6)' : 'none'
        }}
      >
        {cover ? (
          <img src={cover} alt={song.name} className="w-full h-full object-cover block" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-4 text-center bg-gradient-to-br from-white/10 to-black/40">
            <Disc size={32} className="mb-2 opacity-30" />
          </div>
        )}

        {/* Modern Playing Overlay */}
        {isActive && isPlaying && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            {/* Blurred Dark Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" />

            {/* Center Visualizer Container */}
            <div className="relative flex items-center justify-center">

              {/* Expanding Ripple Effects - HIDDEN IN PERFORMANCE MODE */}
              {!performanceMode && (
                <>
                  <div
                    className="absolute inset-0 rounded-full border opacity-60 animate-ripple"
                    style={{ borderColor: accentColor }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border opacity-40 animate-ripple"
                    style={{ borderColor: accentColor, animationDelay: '0.6s' }}
                  />
                </>
              )}

              {/* Glass Circle */}
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.4)] relative z-10">

                {/* Modern Equalizer Bars - OR SIMPLE ICON IN PERFORMANCE MODE */}
                {!performanceMode ? (
                  <div className="flex items-center gap-1 h-6">
                    <div className="w-1 bg-white rounded-full animate-equalizer shadow-lg" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 bg-white rounded-full animate-equalizer shadow-lg" style={{ animationDelay: '0.2s', height: '60%' }}></div>
                    <div
                      className="w-1 rounded-full animate-equalizer shadow-lg"
                      style={{ animationDelay: '0.1s', backgroundColor: accentColor, height: '100%', boxShadow: `0 0 10px ${accentColor}` }}
                    ></div>
                    <div className="w-1 bg-white rounded-full animate-equalizer shadow-lg" style={{ animationDelay: '0.3s', height: '50%' }}></div>
                    <div className="w-1 bg-white rounded-full animate-equalizer shadow-lg" style={{ animationDelay: '0.15s' }}></div>
                  </div>
                ) : (
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gloss */}
        {!performanceMode && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>

      {/* Label (Visible in Grid mode) */}
      <div
        className="mt-3 text-center transition-all duration-500 absolute top-full left-0 w-full"
        style={{
          opacity: style.width === ARC_COVER_SIZE ? 0 : 1,
          transform: style.width === ARC_COVER_SIZE ? 'translateY(10px)' : 'translateY(0)'
        }}
      >
        <h4 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-white/70'}`}>{song.name}</h4>
        <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
      </div>
    </div>
  );
};

const ShelfView: React.FC<ShelfViewProps> = ({
  songs,
  currentSong,
  isPlaying,
  onSelect,
  onClose,
  accentColor,
  performanceMode = false
}) => {
  const [viewState, setViewState] = useState<'arc' | 'grid'>('arc');
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine focused index to center the Arc correctly
  const focusedIndex = useMemo(() => {
    const idx = songs.findIndex(s => s.id === currentSong?.id);
    return idx === -1 ? 0 : idx;
  }, [songs, currentSong]);

  // Entrance Animation: Mount as Arc -> Transition to Grid
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setViewState('grid');
      });
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Exit Animation logic
  const handleBack = () => {
    // 1. Set State to trigger animations
    setIsExiting(true);
    setViewState('arc');

    // 2. Wait for animation to finish before unmounting
    // Matches the duration-700 of the CSS transition
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse Wheel for Horizontal Scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        // Scroll horizontally with vertical wheel
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef]);


  // --- CALCULATION LOGIC ---

  const calculateStyles = (index: number) => {

    // ARC LOGIC (Matches PrismFlow exactly)
    const offset = index - focusedIndex;
    const absOffset = Math.abs(offset);

    // Spacing adjustment for smaller screens
    const spacingValue = ARC_SPACING * (dimensions.width < 768 ? 0.65 : 1);

    // Center of screen
    const centerX = (dimensions.width - ARC_COVER_SIZE) / 2;
    const centerY = (dimensions.height - ARC_COVER_SIZE) / 2;

    const arcX = centerX + (offset * spacingValue);
    const arcY = centerY;
    const arcZ = absOffset * -280;
    const rotateY = offset === 0 ? 0 : offset > 0 ? -55 : 55;

    // Arc visibility logic (Culling)
    const isArcVisible = absOffset <= 6;

    if (viewState === 'arc') {
      return {
        transform: `translate3d(${arcX}px, ${arcY}px, ${arcZ}px) rotateY(${rotateY}deg)`,
        width: ARC_COVER_SIZE,
        height: ARC_COVER_SIZE,
        opacity: isArcVisible ? (offset === 0 ? 1 : Math.max(0.3, 1 - (absOffset * 0.25))) : 0,
        zIndex: 1000 - absOffset,
        pointerEvents: isArcVisible ? 'auto' : 'none' as const,
        // Reset delay on exit so they flow back together naturally
        transitionDelay: '0ms'
      };
    }

    // GRID LOGIC (Shelf Wall - Horizontal)
    // We fill vertically first (columns), then move right.
    const topPadding = 120;
    const bottomPadding = 40;
    const availableHeight = dimensions.height - topPadding - bottomPadding;

    // Determine number of rows based on available height
    const rows = Math.max(1, Math.floor(availableHeight / (COVER_SIZE + 24 + GAP))); // Cover + Label + Gap

    const col = Math.floor(index / rows);
    const row = index % rows;

    const startX = 80; // Left padding
    const startY = topPadding;

    const gridX = startX + col * (COVER_SIZE + GAP);
    const gridY = startY + row * (COVER_SIZE + 24 + GAP);

    // Subtle Stagger for Entrance:
    // We limit the stagger so the tail doesn't take forever to arrive.
    const staggerDelay = Math.min(index * 15, 300);

    return {
      transform: `translate3d(${gridX}px, ${gridY}px, 0) rotateY(0deg)`,
      width: COVER_SIZE,
      height: COVER_SIZE,
      opacity: 1,
      zIndex: 100 - index,
      pointerEvents: 'auto' as const,
      transitionDelay: `${staggerDelay}ms`
    };
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-transparent overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 transition-opacity duration-700 ease-out ${viewState === 'grid' && !isExiting ? 'opacity-100' : 'opacity-0'}`} />

      {/* Header (Fade out on exit) */}
      <div className={`
         absolute top-0 left-0 w-full p-8 flex justify-between items-center z-[150] transition-all duration-500
         ${viewState === 'grid' && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}
      `}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
            <Music2 size={24} style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Library Shelf</h1>
            <p className="text-white/40 text-sm">{songs.length} Albums</p>
          </div>
        </div>
      </div>

      {/* Scrollable Container - Horizontal */}
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-x-auto overflow-y-hidden ${viewState === 'grid' ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Dummy width to enable scrolling based on grid content */}
        <div style={{
          width: viewState === 'grid'
            ? 80 + (Math.ceil(songs.length / Math.max(1, Math.floor((dimensions.height - 160) / (COVER_SIZE + 24 + GAP)))) * (COVER_SIZE + GAP)) + 100
            : '100vw',
          height: '100%'
        }} />
      </div>



      {/* Items Layer */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {songs.map((song, i) => {
          const isActive = song.id === currentSong?.id;
          // Calculate style here in the parent render cycle to ensure reactivity on resize
          const baseStyle = calculateStyles(i);

          return (
            <ShelfItemWrapper
              key={song.id}
              song={song}
              isActive={isActive}
              isPlaying={isPlaying}
              accentColor={accentColor}
              baseStyle={baseStyle} // Pass calculated style directly
              containerRef={containerRef}
              viewState={viewState}
              onSelect={(s: Song) => {
                onSelect(s);
              }}
              performanceMode={performanceMode}
            />
          );
        })}
      </div>
    </div >
  );
};

const ShelfItemWrapper = ({
  song, isActive, isPlaying, accentColor, baseStyle, containerRef, viewState, onSelect, performanceMode
}: any) => {
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    // Initialize scroll position
    if (containerRef.current) {
      setScrollX(containerRef.current.scrollLeft);
    }

    const handleScroll = () => {
      if (containerRef.current) {
        setScrollX(containerRef.current.scrollLeft);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener('scroll', handleScroll, { passive: true });
    return () => { if (el) el.removeEventListener('scroll', handleScroll); }
  }, [containerRef]);

  // Apply scroll offset ONLY when in Grid mode.
  // In Arc mode, items are fixed to center regardless of scroll.
  const transform = viewState === 'grid'
    ? baseStyle.transform.replace(/translate3d\(([^,]+),\s*([^,]+)px,\s*0\)/, (match: string, x: string, y: string) => {
      // Subtract scrollX from x coordinate
      const newX = parseFloat(x) - scrollX;
      return `translate3d(${newX}px, ${y}px, 0)`;
    })
    : baseStyle.transform;

  const style = { ...baseStyle, transform };

  return (
    <ShelfItem
      song={song}
      // index is no longer needed for calculation here
      index={0}
      isActive={isActive}
      isPlaying={isPlaying}
      accentColor={accentColor}
      style={style}
      onClick={() => onSelect(song)}
      performanceMode={performanceMode}
    />
  );
};

export default ShelfView;