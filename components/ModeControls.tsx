
import React, { useState } from 'react';
import { Home, Image as ImageIcon, Album, LayoutGrid, ScanEye, Maximize, Minimize, ChevronRight, Smartphone } from 'lucide-react';
import { AppMode } from '../types';

interface ModeControlsProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  showPrismBg: boolean;
  setShowPrismBg: (show: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onEnterShelf: () => void;
  onExitShelf: () => void;
  performanceMode?: boolean;
}

const ModeControls: React.FC<ModeControlsProps> = React.memo(({
  appMode,
  setAppMode,
  showPrismBg,
  setShowPrismBg,
  isFullscreen,
  toggleFullscreen,
  onEnterShelf,
  onExitShelf,
  performanceMode = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isStandard = appMode === 'standard';
  const isCoverFlow = appMode === 'coverflow';
  const isShelf = appMode === 'shelf';
  const isImmersive = appMode === 'immersive';

  // --- Components ---

  const ControlButton = ({
    isActive,
    onClick,
    icon,
    label
  }: {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
  }) => (
    <div className="relative group/btn flex items-center justify-center shrink-0 w-10 h-10 aspect-square">
      <button
        onClick={onClick}
        className="absolute inset-0 z-10 w-full h-full rounded-full focus:outline-none"
        aria-label={label}
      />
      <div
        className={`
          absolute inset-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none
          group-hover/btn:scale-110 group-active/btn:scale-90
          ${isActive
            ? 'bg-white shadow-[0_2px_12px_rgba(255,255,255,0.25)]'
            : 'bg-transparent group-hover/btn:bg-white/10'
          }
        `}
      />
      <div className={`
        relative z-20 pointer-events-none transition-colors duration-300 -mt-[0.5px]
        ${isActive ? 'text-black' : 'text-white/50 group-hover/btn:text-white'}
      `}>
        {icon}
      </div>
      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-medium text-white tracking-wide opacity-0 group-hover/btn:opacity-100 transition-all duration-200 delay-100 pointer-events-none whitespace-nowrap shadow-xl translate-y-2 group-hover/btn:translate-y-0 z-50">
        {label}
      </div>
    </div>
  );

  const Separator = () => (
    <div className="w-px h-3.5 bg-white/10 mx-1.5 shrink-0 rounded-full"></div>
  );

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col items-end gap-2">
      {/* HUD Container */}
      <div
        className={`
          relative group/dock flex items-center p-2 rounded-full
          ${performanceMode
            ? 'bg-[#1a1a1a] border border-white/10'
            : 'bg-[#0f0f0f]/60 backdrop-blur-3xl backdrop-saturate-150 border border-white/5 ring-1 ring-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_40px_-10px_rgba(0,0,0,0.6)]'
          }
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          hover:bg-[#0f0f0f]/80 hover:border-white/10 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_-12px_rgba(0,0,0,0.7)]
        `}
      >
        {/* Noise Overlay - HIDDEN IN PERFORMANCE MODE */}
        {!performanceMode && (
          <div
            className="absolute inset-0 rounded-full opacity-[0.03] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          />
        )}

        {!performanceMode && (
          <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 pointer-events-none" />
        )}

        {/* --- Collapsible Content Wrapper --- */}
        <div
          className={`
                flex items-center gap-0.5 overflow-hidden 
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-right
                ${isCollapsed
              ? 'max-w-0 opacity-0 scale-90 -translate-x-2 pointer-events-none'
              : 'max-w-[400px] opacity-100 scale-100 translate-x-0'
            }
            `}
        >
          <ControlButton
            isActive={isStandard}
            onClick={() => setAppMode('standard')}
            icon={<Home size={18} />}
            label="Home"
          />

          <div className={`
                flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${(isCoverFlow || isShelf) ? 'max-w-[100px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'}
            `}>
            <ControlButton
              isActive={showPrismBg}
              onClick={() => setShowPrismBg(!showPrismBg)}
              icon={<ImageIcon size={18} />}
              label="Background"
            />
            <Separator />
          </div>

          <ControlButton
            isActive={isCoverFlow}
            onClick={() => isCoverFlow ? setAppMode('standard') : setAppMode('coverflow')}
            icon={<Album size={18} />}
            label="PrismFlow"
          />

          <ControlButton
            isActive={isShelf}
            onClick={() => isShelf ? onExitShelf() : onEnterShelf()}
            icon={<LayoutGrid size={18} />}
            label="Shelf"
          />

          <Separator />

          <ControlButton
            isActive={isImmersive}
            onClick={() => setAppMode(isImmersive ? 'standard' : 'immersive')}
            icon={<ScanEye size={18} />}
            label="Immersive"
          />

          <Separator />

          <ControlButton
            isActive={isFullscreen}
            onClick={toggleFullscreen}
            icon={isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          />

          <Separator />
        </div>

        {/* --- Toggle Button --- */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
                relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0
                text-white/40 hover:text-white hover:bg-white/10
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90
                ${isCollapsed ? 'rotate-180 bg-white/5 text-white' : 'rotate-0'}
            `}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <ChevronRight size={18} />
        </button>

        {/* Shimmer Effect - HIDDEN IN PERFORMANCE MODE */}
        {!performanceMode && (
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[slide-in-right_1s_ease-out_forwards]" />
          </div>
        )}
      </div>
    </div>
  );
});

export default ModeControls;