import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, Sparkles, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Song } from '../types';
import { parseMusicInfo } from '../utils';

interface MysteryCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (song: Song) => void;
}

const MysteryCodeModal: React.FC<MysteryCodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [downloadSpeed, setDownloadSpeed] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            setCode('');
            setError(null);
            setIsLoading(false);
            setStatus('');
            setProgress(0);
            setDownloadSpeed('');
        }
    }, [isOpen]);

    const downloadFile = async (url: string, onProgress?: (loaded: number, total: number, speed: number) => void): Promise<Blob> => {
        const startTime = performance.now();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported');

        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            const currentTime = performance.now();
            const elapsed = (currentTime - startTime) / 1000; // seconds
            const speed = elapsed > 0 ? loaded / elapsed : 0; // bytes/sec

            if (onProgress) {
                onProgress(loaded, total, speed);
            }
        }

        return new Blob(chunks as any, { type: response.headers.get('content-type') || 'application/octet-stream' });
    };

    const formatSpeed = (bytesPerSec: number): string => {
        if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
        if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        return `${Math.round(bytesPerSec)} B/s`;
    };

    const resolveMysteryCode = async (inputCode: string) => {
        const baseUrl = inputCode.replace(/\/+$/, '');
        const codeName = baseUrl.split('/').pop() || 'Unknown';
        const info = parseMusicInfo(decodeURIComponent(codeName));

        setStatus('Probing resources...');
        console.log(`[MysteryCode] Resolving: ${baseUrl}`);

        // 1. Probe Audio
        const audioExtensions = ['mp3', 'flac', 'wav', 'ogg', 'm4a'];
        let audioUrl: string | null = null;
        let foundExt = '';

        // Probe Logic (HEAD requests)
        for (const ext of audioExtensions) {
            const testUrl = `${baseUrl}/music.${ext}`;
            try {
                const res = await fetch(testUrl, { method: 'HEAD' });
                if (res.ok) {
                    const contentType = res.headers.get('content-type');
                    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
                        continue;
                    }
                    audioUrl = testUrl;
                    foundExt = ext;
                    break;
                }
            } catch (e) {
                console.warn(`[MysteryCode] Failed to probe ${testUrl}`, e);
            }
        }

        if (!audioUrl) throw new Error("No audio found for this code.");

        // 2. Download Audio
        setStatus(`Downloading Audio (${foundExt.toUpperCase()})...`);
        const audioBlob = await downloadFile(audioUrl, (loaded, total, speed) => {
            if (total > 0) {
                setProgress(Math.round((loaded / total) * 100));
            }
            setDownloadSpeed(formatSpeed(speed));
        });
        const localAudioUrl = URL.createObjectURL(audioBlob);


        // 3. Probe & Download Video (Optional)
        let localVideoUrl: string | undefined = undefined;
        try {
            // Quick HEAD check
            const testVideo = `${baseUrl}/video.mp4`;
            const headRes = await fetch(testVideo, { method: 'HEAD' });
            if (headRes.ok) {
                setStatus('Downloading Video...');
                setProgress(0);
                const videoBlob = await downloadFile(testVideo, (loaded, total, speed) => {
                    if (total > 0) setProgress(Math.round((loaded / total) * 100));
                    setDownloadSpeed(formatSpeed(speed));
                });
                localVideoUrl = URL.createObjectURL(videoBlob);
            }
        } catch (e) { /* ignore */ }

        // 4. Probe & Download Lyrics
        let lyrics: string | undefined = undefined;
        try {
            setStatus('Fetching Lyrics...');
            const testLrc = `${baseUrl}/lyrics.lrc`;
            const res = await fetch(testLrc);
            if (res.ok) {
                lyrics = await res.text();
            }
        } catch (e) { /* ignore */ }

        // 5. Probe & Info
        try {
            setStatus('Reading Info...');
            const testInfo = `${baseUrl}/info.txt`;
            const res = await fetch(testInfo);
            if (res.ok) {
                const text = await res.text();
                const lines = text.split('\n');
                lines.forEach(line => {
                    const [key, ...values] = line.split(':');
                    if (key && values.length > 0) {
                        const cleanKey = key.trim().toLowerCase();
                        const cleanValue = values.join(':').trim();
                        if (cleanValue) {
                            if (cleanKey === 'title') info.title = cleanValue;
                            if (cleanKey === 'artist') info.artists = cleanValue.split(',').map(s => s.trim());
                            if (cleanKey === 'album') info.album = cleanValue;
                            if (cleanKey === 'version') info.version = cleanValue;
                            if (cleanKey === 'extra') info.extra = cleanValue;
                        }
                    }
                });
            }
        } catch (e) { /* ignore */ }

        return {
            id: Math.random().toString(36).substr(2, 9),
            name: info.title,
            artist: info.artists.join(', ') || 'Unknown Artist',
            url: localAudioUrl,
            videoUrl: localVideoUrl,
            lyrics,
            metadata: info,
            mysteryCode: inputCode
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatus('Initializing...');

        try {
            const newSong = await resolveMysteryCode(code.trim());
            setStatus('Complete!');
            setTimeout(() => {
                onSuccess(newSong);
                onClose();
            }, 500);
        } catch (err: any) {
            setError(err.message || 'Failed to download content.');
            setIsLoading(false);
            setStatus('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
                <div className="relative overflow-hidden rounded-2xl bg-[#0f0f15]/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.7)] group">

                    {/* Glass Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />

                    {/* Gradient Header */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x" />

                    {/* Close button */}
                    {!isLoading && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="p-8 relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 text-purple-400 shadow-inner">
                                {isLoading ? <Download size={24} className="animate-bounce" /> : <Sparkles size={24} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Mystery Code</h2>
                                <p className="text-sm text-white/40 font-medium">Download & Play</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Paste resource URL..."
                                    className="relative w-full bg-black/20 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-4 focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all font-mono text-sm shadow-inner"
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                                {code && !isLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 animate-in fade-in">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                            </div>

                            {/* Progress Section */}
                            {isLoading && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                                    <div className="flex justify-between text-xs font-mono text-white/60">
                                        <span>{status}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-end text-[10px] font-mono text-white/30">
                                        {downloadSpeed}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-xs px-2 py-2 bg-red-500/10 rounded-lg border border-red-500/20 animate-in slide-in-from-top-1">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !code.trim()}
                                className="w-full relative group overflow-hidden rounded-xl bg-white text-black font-semibold py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg hover:shadow-purple-500/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                                <div className="flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Start Download</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MysteryCodeModal;
