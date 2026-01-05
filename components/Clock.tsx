import React, { useState, useEffect } from 'react';

interface ClockProps {
  timezone: string;
  accentColor: string;
}

const Clock: React.FC<ClockProps> = ({ timezone, accentColor }) => {
  const [time, setTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format Date: 2023/10/24 Tuesday
  const formatDate = (date: Date) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone === 'Local' ? undefined : timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
      };
      // Format usually returns "weekday, month/day/year" depending on locale, 
      // let's manually construct for the specific requested format "YYYY/MM/DD Weekday"
      
      // We get parts to reconstruct exactly what we want regardless of browser locale
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
      
      return `${getPart('year')}/${getPart('month')}/${getPart('day')} ${getPart('weekday')}`;
    } catch (e) {
      return date.toLocaleDateString();
    }
  };

  // Format Time: 14:30:05
  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString('en-GB', {
        timeZone: timezone === 'Local' ? undefined : timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return "00:00:00";
    }
  };

  return (
    <div 
      className={`
        fixed top-8 left-8 z-[150] pointer-events-none select-none
        transition-all duration-1000 ease-elegant
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      <div className="flex flex-col items-start drop-shadow-lg">
        {/* Date Line */}
        <div className="flex items-center gap-3">
            <div 
                className="h-px w-8 bg-white/60"
                style={{ backgroundColor: accentColor }}
            ></div>
            <span className="text-white/90 text-lg md:text-xl font-light tracking-widest uppercase">
                {formatDate(time)}
            </span>
        </div>

        {/* Time Line */}
        <h1 className="text-6xl md:text-8xl font-thin text-white tracking-tight leading-none mt-2 tabular-nums mix-blend-overlay">
          {formatTime(time)}
        </h1>
        <h1 className="text-6xl md:text-8xl font-thin text-white tracking-tight leading-none -mt-[1em] tabular-nums opacity-60 mask-image-gradient blur-[1px]">
          {formatTime(time)}
        </h1>
      </div>
    </div>
  );
};

export default Clock;