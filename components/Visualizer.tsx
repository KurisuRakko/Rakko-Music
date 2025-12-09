import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  bassBoost: boolean;
  accentColor: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioElement, isPlaying, bassBoost, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Handle Bass Boost Toggle
  useEffect(() => {
    if (bassFilterRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      // Smooth transition for bass boost
      bassFilterRef.current.gain.cancelScheduledValues(currentTime);
      bassFilterRef.current.gain.linearRampToValueAtTime(bassBoost ? 12 : 0, currentTime + 0.1);
    }
  }, [bassBoost]);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    // Initialize Audio Context
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // High resolution for smooth curves
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;

      // Create Bass Boost Filter (LowShelf)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200; // Boost frequencies below 200Hz
      bassFilter.gain.value = bassBoost ? 12 : 0;
      bassFilterRef.current = bassFilter;

      try {
        const source = ctx.createMediaElementSource(audioElement);
        sourceRef.current = source;

        // Connect Chain: Source -> BassFilter -> Analyser -> Destination
        source.connect(bassFilter);
        bassFilter.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.warn("Media source connection warning:", e);
      }
    }

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // --- Drawing the "Liquid Wave" ---
      
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, accentColor); // Start with accent
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)'); // White center
      gradient.addColorStop(1, accentColor); // End with accent (faded handled by opacity)

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = accentColor;
      
      ctx.beginPath();

      const sliceWidth = width / 100; // Draw fewer points for smoother curve
      let x = 0;
      
      // Move to start (middle height)
      ctx.moveTo(0, height / 2);

      // We only use the lower frequencies (first 30% of data) as they are more musical visually
      const relevantDataLength = Math.floor(bufferLength * 0.3);
      const step = Math.floor(relevantDataLength / 100);

      for (let i = 0; i < 100; i++) {
        const dataIndex = i * step;
        const v = dataArray[dataIndex] / 255.0;
        
        // Symmetrical mirroring calculation
        // We want a wave that pulses out from center
        
        const yDeviation = v * (height * 0.4); 
        
        // Simple sine approximation + audio data
        const y = (height / 2) + Math.sin(i * 0.5) * 10 - yDeviation; 

        // Use bezier curve for smoothness instead of lineTo
        // Simple smoothing: use midpoint between this point and next as control
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            // Just standard lineTo for now, high res looks good enough
             ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      
      // Draw the bottom half (mirror) to create a "sound shape"
      for (let i = 99; i >= 0; i--) {
         const dataIndex = i * step;
         const v = dataArray[dataIndex] / 255.0;
         const yDeviation = v * (height * 0.4); 
         const y = (height / 2) - Math.sin(i * 0.5) * 10 + yDeviation;
         
         ctx.lineTo(x, y);
         x -= sliceWidth;
      }

      ctx.closePath();
      ctx.stroke();

      // Fill slightly
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fill();

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    // Handle AudioContext state (Chrome autoplay policy)
    if (isPlaying && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      renderFrame();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioElement, isPlaying, accentColor]);

  return (
    <canvas 
      ref={canvasRef} 
      width={1000} 
      height={300} 
      className="w-full h-full object-contain opacity-80"
    />
  );
};

export default Visualizer;