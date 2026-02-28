/**
 * Rakko Interconnect View - Pairing & Remote Control Interface
 * 
 * Replaces ControllerView.tsx with interconnect pairing capabilities.
 * Provides UI for:
 * - Displaying and sharing pairing code
 * - Connecting to other devices via code
 * - Master/Slave role selection
 * - Remote playback controls (when connected)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
    Volume2, Volume1, VolumeX, Music2,
    Link2, Unlink, RefreshCw, Wifi, WifiOff,
    Crown, Users, Radio
} from 'lucide-react';
import { CustomSlider } from './ui/CustomSlider';
import { useRakkoInterconnect } from '../RakkoInterconnect/useRakkoInterconnect';
import {
    InterconnectRole,
    ConnectionState,
    PeerInfo,
    TrackBroadcast,
    LyricsBroadcast,
    PlaybackBroadcast,
    BroadcastSongInfo
} from '../RakkoInterconnect/types';

import { Song, AudioState } from '../types';

// ==================== Props ====================

interface InterconnectViewProps {
    accentColor?: string;
    deviceName?: string;
    currentSong?: Song | null;
    audioState?: AudioState | null;
    currentLyric?: string;
    nextLyric?: string;
}

// ==================== Component ====================

const InterconnectView: React.FC<InterconnectViewProps> = ({
    accentColor = '#22c55e',
    deviceName,
    currentSong,
    audioState,
    currentLyric,
    nextLyric,
}) => {
    // Local state for received data (slave mode)
    const [receivedTrack, setReceivedTrack] = useState<BroadcastSongInfo | null>(null);
    const [receivedLyrics, setReceivedLyrics] = useState({ current: '', next: '' });
    const [receivedPlayback, setReceivedPlayback] = useState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isLooping: false,
        isShuffle: false,
    });

    // Pairing input
    const [pairInput, setPairInput] = useState('');
    const [showPairInput, setShowPairInput] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Interconnect hook
    const {
        pairingCode,
        role,
        connectionState,
        connectedPeers,
        discoveredPeers,
        setRole,
        regenerateCode,
        pairWithCode,
        disconnect,
        sendCommand,
        isEnabled,
        setEnabled,
    } = useRakkoInterconnect({
        enabled: true,
        role: 'slave',
        deviceName,
        currentSong,
        audioState: audioState || undefined,
        currentLyric,
        nextLyric,
        onTrackUpdate: (data) => setReceivedTrack(data.song),
        onLyricsUpdate: (data) => setReceivedLyrics({ current: data.currentLyric, next: data.nextLyric }),
        onPlaybackUpdate: (data) => setReceivedPlayback({
            isPlaying: data.isPlaying,
            currentTime: data.currentTime,
            duration: data.duration,
            volume: data.volume,
            isLooping: data.isLooping,
            isShuffle: data.isShuffle,
        }),
    });

    // Focus input when shown
    useEffect(() => {
        if (showPairInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showPairInput]);

    // Handle pairing submit
    const handlePairSubmit = () => {
        if (pairInput.length === 4) {
            pairWithCode(pairInput);
            setPairInput('');
            setShowPairInput(false);
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Connection status helpers
    const isConnected = connectionState === 'connected';
    const isPairing = connectionState === 'pairing';
    const isDiscovering = connectionState === 'discovering';

    const getStatusIcon = () => {
        switch (connectionState) {
            case 'connected': return <Wifi className="text-green-400" size={16} />;
            case 'pairing': return <Radio className="text-yellow-400 animate-pulse" size={16} />;
            case 'discovering': return <Radio className="text-blue-400 animate-pulse" size={16} />;
            default: return <WifiOff className="text-red-400" size={16} />;
        }
    };

    const getStatusText = () => {
        switch (connectionState) {
            case 'connected': return `已连接 (${connectedPeers.length})`;
            case 'pairing': return '配对中...';
            case 'discovering': return '搜索中...';
            default: return '未连接';
        }
    };

    const getRoleIcon = () => {
        switch (role) {
            case 'master': return <Crown size={14} />;
            case 'slave': return <Users size={14} />;
            default: return null;
        }
    };

    const getRoleText = () => {
        switch (role) {
            case 'master': return '主机';
            case 'slave': return '从机';
            default: return '独立';
        }
    };

    return (
        <div className="w-screen h-screen bg-[#09090b] text-white flex flex-col font-sans select-none overflow-hidden">

            {/* === HEADER === */}
            <div className="p-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Link2 size={20} style={{ color: accentColor }} />
                        <span className="font-bold text-lg">Rakko 互联</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className="text-xs text-white/60">{getStatusText()}</span>
                    </div>
                </div>

                {/* Role Selector */}
                <div className="flex gap-2 mb-4">
                    {(['master', 'slave', 'standalone'] as InterconnectRole[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                flex items-center justify-center gap-2
                ${role === r
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'}
              `}
                            style={{
                                borderColor: role === r ? accentColor : undefined,
                                color: role === r ? accentColor : undefined
                            }}
                        >
                            {r === 'master' && <Crown size={14} />}
                            {r === 'slave' && <Users size={14} />}
                            {r === 'master' ? '主机' : r === 'slave' ? '从机' : '独立'}
                        </button>
                    ))}
                </div>
            </div>

            {/* === PAIRING SECTION === */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-b from-[#111] to-[#09090b]">

                {/* My Pairing Code */}
                <div className="text-center mb-6">
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-2">我的配对码</p>
                    <div className="flex items-center justify-center gap-4">
                        <div
                            className="text-5xl font-mono font-bold tracking-[0.3em] px-6 py-4 rounded-2xl bg-white/5 border border-white/10"
                            style={{ color: accentColor }}
                        >
                            {pairingCode}
                        </div>
                        <button
                            onClick={regenerateCode}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                            title="重新生成配对码"
                        >
                            <RefreshCw size={20} className="text-white/60" />
                        </button>
                    </div>
                    <p className="text-xs text-white/30 mt-3">在其他设备上输入此配对码以连接</p>
                </div>

                {/* Pair with Code Input */}
                <div className="max-w-xs mx-auto">
                    {!showPairInput ? (
                        <button
                            onClick={() => setShowPairInput(true)}
                            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Link2 size={18} />
                            <span>输入配对码连接</span>
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={pairInput}
                                onChange={(e) => setPairInput(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={(e) => e.key === 'Enter' && handlePairSubmit()}
                                placeholder="输入 4 位配对码"
                                className="w-full py-3 px-4 rounded-xl bg-white/10 border border-white/20 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-white/40"
                                style={{ caretColor: accentColor }}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowPairInput(false); setPairInput(''); }}
                                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handlePairSubmit}
                                    disabled={pairInput.length !== 4}
                                    className="flex-1 py-2 rounded-lg transition-all disabled:opacity-30"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    连接
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* === CONNECTED PEERS === */}
            {connectedPeers.length > 0 && (
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">已连接设备</h3>
                    <div className="space-y-2">
                        {connectedPeers.map((peer) => (
                            <div
                                key={peer.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: `${accentColor}20` }}
                                    >
                                        {peer.role === 'master' ? <Crown size={18} style={{ color: accentColor }} /> : <Users size={18} style={{ color: accentColor }} />}
                                    </div>
                                    <div>
                                        <div className="font-medium">{peer.name}</div>
                                        <div className="text-xs text-white/40">
                                            {peer.role === 'master' ? '主机' : '从机'} · {peer.code}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnect(peer.id)}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
                                >
                                    <Unlink size={16} className="text-red-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === DISCOVERED PEERS === */}
            {discoveredPeers.length > 0 && !isConnected && (
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">发现的设备</h3>
                    <div className="space-y-2">
                        {discoveredPeers.map((peer) => (
                            <div
                                key={peer.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <Radio size={14} className="text-white/40" />
                                    </div>
                                    <div>
                                        <div className="text-sm">{peer.name}</div>
                                        <div className="text-xs text-white/30">{peer.code}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => pairWithCode(peer.code)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                                >
                                    连接
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === NOW PLAYING (Slave Mode) === */}
            {role === 'slave' && receivedTrack && (
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex flex-col items-center gap-6">

                        {/* Album Art Placeholder */}
                        <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            {receivedTrack.coverUrl ? (
                                <img src={receivedTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <Music2 size={48} className="text-white/20" />
                            )}
                        </div>

                        {/* Track Info */}
                        <div className="text-center">
                            <h2 className="text-xl font-bold">{receivedTrack.name}</h2>
                            <p className="text-sm text-white/60">{receivedTrack.artist}</p>
                        </div>

                        {/* Lyrics */}
                        {receivedLyrics.current && (
                            <div className="text-center max-w-sm">
                                <p className="text-lg" style={{ color: accentColor }}>{receivedLyrics.current}</p>
                                <p className="text-sm text-white/40 mt-1">{receivedLyrics.next}</p>
                            </div>
                        )}

                        {/* Progress */}
                        <div className="w-full max-w-sm flex items-center gap-3">
                            <span className="text-xs text-white/30 font-mono">
                                {formatTime(receivedPlayback.currentTime)}
                            </span>
                            <div className="flex-1">
                                <CustomSlider
                                    value={receivedPlayback.currentTime}
                                    max={receivedPlayback.duration || 100}
                                    onChange={(e) => sendCommand('SEEK', Number(e.target.value))}
                                    accentColor={accentColor}
                                />
                            </div>
                            <span className="text-xs text-white/30 font-mono">
                                {formatTime(receivedPlayback.duration)}
                            </span>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => sendCommand('PREV')}
                                className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-90"
                            >
                                <SkipBack size={24} fill="currentColor" />
                            </button>
                            <button
                                onClick={() => sendCommand('TOGGLE_PLAY')}
                                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
                                style={{ backgroundColor: accentColor }}
                            >
                                {receivedPlayback.isPlaying
                                    ? <Pause size={28} fill="black" className="text-black" />
                                    : <Play size={28} fill="black" className="text-black ml-1" />
                                }
                            </button>
                            <button
                                onClick={() => sendCommand('NEXT')}
                                className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-90"
                            >
                                <SkipForward size={24} fill="currentColor" />
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-3 w-full max-w-xs">
                            <button
                                onClick={() => sendCommand('SET_VOLUME', receivedPlayback.volume > 0 ? 0 : 0.5)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                {receivedPlayback.volume === 0 ? <VolumeX size={18} /> :
                                    receivedPlayback.volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                            </button>
                            <div className="flex-1">
                                <CustomSlider
                                    value={receivedPlayback.volume}
                                    max={1}
                                    step={0.05}
                                    onChange={(e) => sendCommand('SET_VOLUME', Number(e.target.value))}
                                    accentColor={accentColor}
                                />
                            </div>
                        </div>

                        {/* Mode Controls */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => sendCommand('SET_SHUFFLE', !receivedPlayback.isShuffle)}
                                className={`p-2 rounded-lg transition-all ${receivedPlayback.isShuffle ? 'bg-white/10' : 'opacity-40'}`}
                                style={{ color: receivedPlayback.isShuffle ? accentColor : undefined }}
                            >
                                <Shuffle size={18} />
                            </button>
                            <button
                                onClick={() => sendCommand('SET_LOOP', !receivedPlayback.isLooping)}
                                className={`p-2 rounded-lg transition-all ${receivedPlayback.isLooping ? 'bg-white/10' : 'opacity-40'}`}
                                style={{ color: receivedPlayback.isLooping ? accentColor : undefined }}
                            >
                                <Repeat size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === WAITING STATE (Slave with no data) === */}
            {role === 'slave' && !receivedTrack && isConnected && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-white/30">
                        <Music2 size={48} className="mx-auto mb-4 opacity-30" />
                        <p>等待主机播放音乐...</p>
                    </div>
                </div>
            )}

            {/* === MASTER MODE INFO === */}
            {role === 'master' && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <Crown size={48} className="mx-auto mb-4" style={{ color: accentColor }} />
                        <h2 className="text-xl font-bold mb-2">主机模式</h2>
                        <p className="text-white/50 text-sm max-w-xs mx-auto">
                            您的播放状态将广播给所有已连接的从机设备。
                        </p>
                        {connectedPeers.length > 0 && (
                            <div className="mt-4 px-4 py-2 rounded-full bg-white/5 inline-flex items-center gap-2">
                                <Users size={14} />
                                <span className="text-sm">{connectedPeers.length} 台设备已连接</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === STANDALONE MODE INFO === */}
            {role === 'standalone' && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center text-white/30">
                        <WifiOff size={48} className="mx-auto mb-4 opacity-30" />
                        <p>独立模式 - 不发送或接收数据</p>
                    </div>
                </div>
            )}

        </div>
    );
};

export default InterconnectView;
