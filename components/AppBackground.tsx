
import React, { RefObject } from 'react';
import { Song, AppMode, AppSettings } from '../types';


interface AppBackgroundProps {
    appMode: AppMode;
    currentCover: string | null;
    currentSong: Song | null;
    isPlaying: boolean;
    settings: AppSettings;
    videoRef: RefObject<HTMLVideoElement>;
    audioElement: HTMLAudioElement;
    showPrismBg: boolean;
    loopVideo?: boolean;
}

const AppBackground: React.FC<AppBackgroundProps> = ({
    appMode,
    currentCover,
    currentSong,
    isPlaying,
    settings,
    videoRef,
    audioElement,
    showPrismBg,
    loopVideo = false
}) => {
    const isImmersive = appMode === 'immersive';
    const isCoverFlow = appMode === 'coverflow';
    const isShelf = appMode === 'shelf';
    const isStandard = appMode === 'standard';

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {settings.performanceMode ? (
                // PERFORMANCE MODE: Single simple background layer
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                    style={{
                        backgroundImage: currentCover ? `url(${currentCover})` : `url(${settings.wallpaper})`,
                        filter: 'brightness(0.25)', // Just darken, no blur
                    }}
                />
            ) : (
                // STANDARD MODE: Complex layered background
                <>
                    {/* Base Background (Cover Art or Wallpaper) */}
                    <div
                        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-elegant ${!isStandard ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
                        style={{
                            backgroundImage: currentCover ? `url(${currentCover})` : `url(${settings.wallpaper})`,
                            filter: 'blur(30px) brightness(0.7)',
                        }}
                    />

                    {/* Video Background Layer */}
                    {currentSong?.videoUrl && (
                        <div className={`absolute inset-0 overflow-hidden transition-all duration-1000 ease-elegant will-change-transform
                  ${isImmersive ? 'opacity-100 scale-100 blur-none z-10' : 'opacity-100 scale-105 blur-[30px] z-0'}
               `}>
                            <video
                                ref={videoRef}
                                src={currentSong.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                loop={loopVideo}
                                playsInline
                            />
                            {/* Overlay to darken video in standard mode so text is readable */}
                            {!isImmersive && <div className="absolute inset-0 bg-black/40" />}
                        </div>
                    )}

                    {/* Immersive Mode Clean Background (Only if no video) */}
                    {!currentSong?.videoUrl && (
                        <div
                            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-elegant ${isImmersive ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-105 blur-md'}`}
                            style={{
                                backgroundImage: `url(${settings.wallpaper})`,
                                filter: 'brightness(1)',
                            }}
                        >
                        </div>
                    )}

                    {/* Prism/Shelf Background Overlay */}
                    <div
                        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-elegant ${(isCoverFlow || isShelf) && showPrismBg ? 'opacity-100 scale-105 blur-lg' : 'opacity-0 scale-100 blur-none'}`}
                        style={{
                            backgroundImage: `url(${settings.wallpaper})`,
                            filter: 'brightness(0.3)',
                        }}
                    />

                    {/* General Dimming Layer */}
                    <div className={`absolute inset-0 bg-black/10 transition-opacity duration-1000 ${isImmersive && currentSong?.videoUrl ? 'opacity-0' : 'opacity-100'}`} />
                </>
            )}
        </div>
    );
};

export default React.memo(AppBackground);
