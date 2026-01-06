import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react';
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
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            // Cancel any ongoing operations if modal is closed (though usually onClose handles this logic check)
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setCode('');
            setError(null);
            setIsLoading(false);
            setStatus('');
            setProgress(0);
            setDownloadSpeed('');
        }
    }, [isOpen]);

    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        onClose();
    };

    const downloadFile = async (url: string, signal: AbortSignal, onProgress?: (loaded: number, total: number, speed: number) => void): Promise<Blob> => {
        const startTime = performance.now();
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported');

        const chunks: Uint8Array[] = [];

        try {
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
        } catch (err: any) {
            if (err.name === 'AbortError') {
                throw new Error('Download cancelled');
            }
            throw err;
        }

        return new Blob(chunks as any, { type: response.headers.get('content-type') || 'application/octet-stream' });
    };

    const formatSpeed = (bytesPerSec: number): string => {
        if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
        if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        return `${Math.round(bytesPerSec)} B/s`;
    };

    const resolveMysteryCode = async (inputCode: string, signal: AbortSignal) => {
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
            if (signal.aborted) throw new Error('Cancelled');
            const testUrl = `${baseUrl}/music.${ext}`;
            try {
                const res = await fetch(testUrl, { method: 'HEAD', signal });
                if (res.ok) {
                    const contentType = res.headers.get('content-type');
                    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
                        continue;
                    }
                    audioUrl = testUrl;
                    foundExt = ext;
                    break;
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.warn(`[MysteryCode] Failed to probe ${testUrl}`, e);
            }
        }

        if (!audioUrl) throw new Error("No audio found for this code.");

        // 2. Download Audio
        setStatus(`Downloading Audio (${foundExt.toUpperCase()})...`);
        const audioBlob = await downloadFile(audioUrl, signal, (loaded, total, speed) => {
            if (total > 0) {
                setProgress(Math.round((loaded / total) * 100));
            }
            setDownloadSpeed(formatSpeed(speed));
        });
        const localAudioUrl = URL.createObjectURL(audioBlob);


        // 3. Probe & Download Video (Optional)
        let localVideoUrl: string | undefined = undefined;
        try {
            if (signal.aborted) throw new Error('Cancelled');
            // Quick HEAD check
            const testVideo = `${baseUrl}/video.mp4`;
            const headRes = await fetch(testVideo, { method: 'HEAD', signal });
            if (headRes.ok) {
                setStatus('Downloading Video...');
                setProgress(0);
                const videoBlob = await downloadFile(testVideo, signal, (loaded, total, speed) => {
                    if (total > 0) setProgress(Math.round((loaded / total) * 100));
                    setDownloadSpeed(formatSpeed(speed));
                });
                localVideoUrl = URL.createObjectURL(videoBlob);
            }
        } catch (e: any) { if (e.name === 'AbortError') throw e; }

        // 4. Probe & Download Lyrics
        let lyrics: string | undefined = undefined;
        try {
            if (signal.aborted) throw new Error('Cancelled');
            setStatus('Fetching Lyrics...');
            const testLrc = `${baseUrl}/lyrics.lrc`;
            const res = await fetch(testLrc, { signal });
            if (res.ok) {
                lyrics = await res.text();
            }
        } catch (e: any) { if (e.name === 'AbortError') throw e; }

        // 5. Probe & Info
        try {
            if (signal.aborted) throw new Error('Cancelled');
            setStatus('Reading Info...');
            const testInfo = `${baseUrl}/info.txt`;
            const res = await fetch(testInfo, { signal });
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
        } catch (e: any) { if (e.name === 'AbortError') throw e; }

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

        // Cancel previous if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatus('Initializing...');

        try {
            const newSong = await resolveMysteryCode(code.trim(), controller.signal);
            if (controller.signal.aborted) return;

            setStatus('Complete!');
            setTimeout(() => {
                if (!controller.signal.aborted) {
                    onSuccess(newSong);
                    onClose();
                }
            }, 500);
        } catch (err: any) {
            if (err.message === 'Cancelled' || err.name === 'AbortError') {
                return; // Silent fail on cancel
            }
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
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[400px] transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
                <div className="relative overflow-hidden rounded-xl bg-[#0f0f0f] border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-20"
                    >
                        <X size={18} />
                    </button>

                    <div className="p-6">
                        <div className="flex flex-col gap-1 mb-6">
                            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                                <Download size={18} className="text-white/50" />
                                Import Resource
                            </h2>
                            <p className="text-xs text-white/40">Enter a URL to download and play content.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="https://example.com/music..."
                                    className="w-full bg-[#1a1a1a] border border-white/5 text-white placeholder-white/20 rounded-lg px-3 py-3 focus:outline-none focus:border-white/20 focus:bg-[#222] transition-all font-mono text-xs"
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                                {code && !isLoading && !error && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in fade-in">
                                        <CheckCircle2 size={14} />
                                    </div>
                                )}
                            </div>

                            {/* Progress Section */}
                            {isLoading && (
                                <div className="space-y-3 py-2 animate-in slide-in-from-top-2 fade-in">
                                    <div className="flex justify-between items-end text-[10px] font-mono uppercase tracking-wider text-white/40">
                                        <span>{status}</span>
                                        <span>{progress}%</span>
                                    </div>

                                    <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-end text-[10px] font-mono text-white/20">
                                        {downloadSpeed}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg animate-in slide-in-from-top-1">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !code.trim()}
                                className="w-full rounded-lg bg-white text-black font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:bg-gray-100 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Downloading...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Start Download</span>
                                        <ArrowRight size={14} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MysteryCodeModal;
