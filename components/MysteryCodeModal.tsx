import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface MysteryCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (code: string) => Promise<void>;
}

const MysteryCodeModal: React.FC<MysteryCodeModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            setCode('');
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await onSubmit(code.trim());
            onClose();
        } catch (err) {
            setError('Failed to resolve code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
                <div className="relative overflow-hidden rounded-2xl bg-[#1e1e2e] border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">

                    {/* Decorative gradients */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <div className="absolute -top-[100px] -right-[100px] w-[200px] h-[200px] bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute -bottom-[100px] -left-[100px] w-[200px] h-[200px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 text-purple-400">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Mystery Code</h2>
                                <p className="text-sm text-white/40">Enter code to discover resources</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Paste your URL code here..."
                                    className="relative w-full bg-black/20 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-4 focus:outline-none focus:border-white/20 focus:bg-black/40 transition-all font-mono text-sm"
                                    disabled={isLoading}
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs px-1 animate-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !code.trim()}
                                className="w-full relative group overflow-hidden rounded-xl bg-white text-black font-medium py-3.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                                <div className="flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Resolving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Unveil</span>
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
