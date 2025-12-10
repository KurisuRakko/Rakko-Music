import React, { useMemo, useEffect, useRef } from 'react';
import { parseLrc } from '../utils';
import { Upload, Music } from 'lucide-react';

interface LyricsViewProps {
  lyrics: string | undefined;
  currentTime: number;
  onImportLyrics: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accentColor: string;
  onSeek: (time: number) => void;
  variant?: 'default' | 'immersive';
}

const LyricsView: React.FC<LyricsViewProps> = ({ 
  lyrics, 
  currentTime, 
  onImportLyrics, 
  accentColor, 
  onSeek,
  variant = 'default'
}) => {
  const parsedLyrics = useMemo(() => lyrics ? parseLrc(lyrics) : [], [lyrics]);
  
  const activeIndex = useMemo(() => {
    if (!parsedLyrics.length) return -1;
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time <= currentTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLyrics, currentTime]);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Physics State for Spring Animation
  const physicsRef = useRef({
    scrollTop: 0,    // Current actual scroll position
    targetTop: 0,    // Where we want to be
    velocity: 0,     // Current speed
    lastTime: 0,     // For delta time calculation
    isAnimating: false
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    lineRefs.current = new Array(parsedLyrics.length).fill(null);
  }, [parsedLyrics]);

  const lineProgress = useMemo(() => {
     if (activeIndex === -1 || !parsedLyrics.length) return 0;
     const currentLine = parsedLyrics[activeIndex];
     const nextLine = parsedLyrics[activeIndex + 1];
     
     const startTime = currentLine.time;
     const endTime = nextLine ? nextLine.time : startTime + 5; 
     const duration = endTime - startTime;
     
     if (duration <= 0) return 0;
     const progress = (currentTime - startTime) / duration;
     return Math.max(0, Math.min(1, progress));
  }, [currentTime, activeIndex, parsedLyrics]);

  // --- Spring Physics Animation Logic ---
  useEffect(() => {
    if (activeIndex === -1 || !containerRef.current || !lineRefs.current[activeIndex]) return;

    const calculateTarget = () => {
        const container = containerRef.current;
        const activeLine = lineRefs.current[activeIndex];
        if (!container || !activeLine) return null;

        const containerHeight = container.clientHeight;
        const lineHeight = activeLine.clientHeight;
        const lineOffsetTop = activeLine.offsetTop;
        
        // Focus Ratio: 0.85 for immersive (bottom aligned), 0.35 for default (top-center)
        const focusRatio = variant === 'immersive' ? 0.85 : 0.35;
        
        // Calculate target scroll position
        let target = lineOffsetTop - (containerHeight * focusRatio) + (lineHeight / 2);
        
        // Clamp target to valid scroll range
        const maxScroll = container.scrollHeight - containerHeight;
        target = Math.max(0, Math.min(target, maxScroll));
        
        return target;
    };

    const startSpringAnimation = () => {
        const state = physicsRef.current;
        const container = containerRef.current;
        
        const newTarget = calculateTarget();
        if (newTarget === null) return;

        // Update target immediately. The physics loop will handle the rest.
        state.targetTop = newTarget;

        // If loop is already running, we don't need to restart it. 
        // Just updating targetTop is enough for the "interruptible" effect.
        if (state.isAnimating) return;

        state.isAnimating = true;
        state.lastTime = performance.now();
        // Sync internal state with DOM just in case
        if (container) state.scrollTop = container.scrollTop;

        const loop = (now: number) => {
             const dt = Math.min((now - state.lastTime) / 1000, 0.1); // Cap dt to prevent huge jumps
             state.lastTime = now;

             // Spring Constants
             // Tension: How fast it pulls towards target (higher = snappier)
             // Friction: How much it resists movement (higher = less oscillation)
             const tension = 180; 
             const friction = 26; 

             const displacement = state.targetTop - state.scrollTop;
             const acceleration = tension * displacement - friction * state.velocity;

             state.velocity += acceleration * dt;
             state.scrollTop += state.velocity * dt;

             if (container) {
                 container.scrollTop = state.scrollTop;
             }

             // Stop condition: Near target AND slow velocity
             if (Math.abs(displacement) < 0.5 && Math.abs(state.velocity) < 1) {
                 state.isAnimating = false;
                 // Snap to exact spot to stop micro-jitters
                 if (container) container.scrollTop = state.targetTop;
                 state.scrollTop = state.targetTop;
                 state.velocity = 0;
                 rafRef.current = null;
             } else {
                 rafRef.current = requestAnimationFrame(loop);
             }
        };

        rafRef.current = requestAnimationFrame(loop);
    };

    startSpringAnimation();

    // Re-calculate target after layout transition (e.g. entering immersive mode)
    // The physics engine handles the mid-flight adjustment smoothly.
    const transitionTimeout = setTimeout(startSpringAnimation, 550);

    return () => {
       clearTimeout(transitionTimeout);
       if (rafRef.current) {
           // Cleanup handled by state check
       }
    };
  }, [activeIndex, variant]);

  // Stop animation loop if component unmounts
  useEffect(() => {
      return () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
  }, []);


  // --- Dynamic Typography Classes based on Variant ---
  const getTextSize = (isActive: boolean) => {
    if (variant === 'immersive') {
        return isActive ? 'text-3xl md:text-5xl' : 'text-xl md:text-2xl';
    }
    return isActive ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl';
  };

  const getSpacing = () => {
    if (variant === 'immersive') {
      return 'space-y-6 pt-[85vh] pb-[85vh]';
    }
    return 'space-y-12 py-[40vh]';
  };
  
  const getLineStyle = (index: number, activeIdx: number, isAct: boolean) => {
      // Common optimization: GPU acceleration hint
      const baseTransform = 'translate3d(0,0,0)'; 

      if (variant !== 'immersive') {
          return {
              opacity: isAct ? 1 : 0.35,
              // Using blur is expensive, but requested. We keep it moderate.
              filter: isAct ? 'blur(0px)' : 'blur(4px)',
              transform: `${baseTransform} ${isAct ? 'scale(1.05) translateX(10px)' : 'scale(1) translateX(0)'}`,
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out, filter 0.5s ease-out',
              willChange: 'transform, opacity, filter' // Hint to browser
          };
      }

      const distance = Math.abs(index - activeIdx);
      
      let opacity = 0;
      let blur = '10px';
      let transform = `${baseTransform} scale(1) translateX(0)`;

      if (isAct) {
          opacity = 1;
          blur = '0px';
          transform = `${baseTransform} scale(1.05) translateX(10px)`;
      } else if (distance === 1) {
          opacity = 0.5;
          blur = '2px';
      }

      return { 
          opacity, 
          filter: `blur(${blur})`, 
          transform,
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, filter 0.4s ease-out',
          willChange: 'transform, opacity, filter'
      };
  };

  if (!lyrics) {
    if (variant === 'immersive') return null;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 animate-scale-fade-in">
         <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse-slow">
            <Music size={40} className="text-white/20" />
         </div>
         <h3 className="text-xl font-bold text-white mb-2">No Lyrics Found</h3>
         <p className="text-white/40 mb-8 max-w-xs text-sm">Add a .lrc file to sing along.</p>
         
         <label 
            className="cursor-pointer group flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all duration-300 active:scale-95 border border-white/10"
            style={{ boxShadow: `0 0 20px -5px ${accentColor}40` }}
         >
            <input 
               type="file" 
               accept=".lrc,.txt"
               className="hidden" 
               onChange={onImportLyrics}
            />
            <Upload size={18} />
            <span className="text-sm font-bold">Import Lyrics</span>
         </label>
      </div>
    );
  }

  if (parsedLyrics.length === 0 && lyrics) {
      return (
         <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar flex items-center justify-center">
             <pre className="whitespace-pre-wrap font-sans text-white/80 text-lg md:text-2xl font-medium leading-relaxed text-center opacity-80">
                 {lyrics}
             </pre>
         </div>
      )
  }

  return (
    <div 
        ref={containerRef}
        className={`w-full h-full relative ${variant === 'immersive' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}
        style={{ 
          scrollBehavior: 'auto', // Important: Disable native smooth scrolling to let Physics take over
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' 
        }}
    >
      <div className={`flex flex-col px-6 transition-all duration-500 ease-elegant ${getSpacing()}`}>
        {parsedLyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const style = getLineStyle(index, activeIndex, isActive);
          
          return (
            <div
              key={index}
              ref={(el) => { lineRefs.current[index] = el; }}
              onClick={() => onSeek(line.time)}
              className="group cursor-pointer origin-left select-none flex flex-col items-start"
              style={style}
            >
              <p 
                className={`font-bold leading-tight tracking-tight transition-all duration-300 ${getTextSize(isActive)}`}
                style={{
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                    textShadow: isActive ? `0 0 40px ${accentColor}60` : 'none',
                }}
              >
                {line.text}
              </p>
              
              <div 
                className={`mt-4 h-[3px] rounded-full bg-white/10 overflow-hidden transition-all duration-700 ease-out ${isActive ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}
              >
                 <div 
                    className="h-full rounded-full transition-all ease-linear"
                    style={{ 
                        width: `${isActive ? lineProgress * 100 : 0}%`, 
                        backgroundColor: accentColor,
                        transitionDuration: '250ms' 
                    }}
                 />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsView;