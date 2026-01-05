import React, { useState, useEffect } from 'react';

interface ClockProps {
  scale?: number;
  showMilliseconds?: boolean;
}

const Clock: React.FC<ClockProps> = ({ scale = 1, showMilliseconds = false }) => {
  const [time, setTime] = useState(new Date());
  const requestRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      setTime(new Date());
      if (showMilliseconds) {
        requestRef.current = requestAnimationFrame(update);
      }
    };

    if (showMilliseconds) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      // Immediate update
      setTime(new Date());

      // Sync to the start of the next second to avoid drift and align update
      const now = new Date();
      const msUntilNextSecond = 1000 - now.getMilliseconds();

      timerRef.current = setTimeout(() => {
        setTime(new Date());
        timerRef.current = setInterval(() => {
          setTime(new Date());
        }, 1000);
      }, msUntilNextSecond);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        clearInterval(timerRef.current);
      }
    };
  }, [showMilliseconds]);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ms = time.getMilliseconds().toString().padStart(3, '0');

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  };
  const dateString = time.toLocaleDateString('en-US', dateOptions);

  return (
    <div
      className="flex flex-col items-start select-none transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
    >
      {/* 
        Liquid Glass Hover Container 
        - Enhanced fluid physics with cubic-bezier(0.25, 1, 0.5, 1)
        - Deep multi-layered glow using box-shadow
        - Smooth backdrop blur transition
      */}
      <div className="group relative p-10 -m-10 rounded-[4rem] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] 
        hover:scale-[1.04] 
        hover:bg-white/[0.08] 
        hover:backdrop-blur-2xl 
        hover:shadow-[0_0_80px_-10px_rgba(255,255,255,0.25),inset_0_0_40px_rgba(255,255,255,0.05)] 
        border border-transparent hover:border-white/20 
        cursor-default"
      >
        {/* 
          Apple-style aesthetics / Android Oreo Cleanliness:
          - System font (inherited from body)
          - Very thin weight
          - Tight tracking
          - Massive size
          - No weird colon styling
        */}
        <div className="flex items-baseline font-thin tracking-tighter text-white/90 tabular-nums -ml-2 md:-ml-3 leading-none transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.01] group-hover:text-white">
          <span className="text-[6rem] md:text-[8rem] lg:text-[10rem] drop-shadow-2xl">{hours}:{minutes}</span>
          {showMilliseconds && (
            <div className="flex items-baseline ml-2 md:ml-4 transition-all duration-300 animate-in fade-in slide-in-from-left-4">
              <span className="text-[3rem] md:text-[4rem] lg:text-[5rem] opacity-70 font-light">:{seconds}</span>
              <span className="text-[1.5rem] md:text-[2rem] lg:text-[2.5rem] opacity-40 font-light w-[3ch] ml-1">.{ms}</span>
            </div>
          )}
        </div>
        <div className="text-lg md:text-2xl font-light tracking-wide mt-2 opacity-60 ml-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-2">
          {dateString}
        </div>
      </div>
    </div>
  );
};

export default Clock;