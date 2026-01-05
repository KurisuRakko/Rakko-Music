
import React, { useState, useRef } from 'react';

interface CustomSliderProps {
    value: number;
    max: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accentColor: string;
    tooltipFormatter?: (val: number) => string;
    className?: string;
    step?: number;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
    value,
    max,
    onChange,
    accentColor,
    tooltipFormatter,
    className = "",
    step = 0.01
}) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    const [previewValue, setPreviewValue] = useState<number | null>(null);
    const [previewLeft, setPreviewLeft] = useState<number>(0);
    const trackRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!tooltipFormatter || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const perc = Math.max(0, Math.min(1, x / rect.width));
        setPreviewValue(perc * max);
        setPreviewLeft(perc * 100);
    };

    const handleMouseLeave = () => {
        setPreviewValue(null);
    };

    return (
        <div
            ref={trackRef}
            className={`group relative flex items-center h-4 cursor-pointer touch-none ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background Track */}
            <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm group-hover:h-1.5 transition-all duration-300 ease-spring"></div>

            {/* Active Track (Fill) */}
            <div
                className="absolute h-1 left-0 rounded-full group-hover:h-1.5 transition-all duration-300 ease-spring"
                style={{ width: `${percentage}%`, backgroundColor: accentColor }}
            >
            </div>

            {/* Thumb (Glow & Handle) */}
            <div
                className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-300 ease-spring -translate-x-1.5"
                style={{ left: `${percentage}%` }}
            ></div>

            {/* Tooltip */}
            {previewValue !== null && tooltipFormatter && (
                <div
                    className="absolute bottom-full mb-3 px-2 py-1 bg-white/90 text-black text-[10px] font-bold rounded transform -translate-x-1/2 pointer-events-none shadow-xl z-30 animate-fade-in backdrop-blur-sm"
                    style={{ left: `${previewLeft}%` }}
                >
                    {tooltipFormatter(previewValue)}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white/90"></div>
                </div>
            )}

            {/* Actual Input (Invisible) */}
            <input
                type="range"
                min={0}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
        </div>
    );
};
