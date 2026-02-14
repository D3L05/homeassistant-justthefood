'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, X, RotateCcw, Volume2 } from 'lucide-react';
import { formatDuration } from '@/lib/timer-parser';

import { useTimerStore } from '@/lib/store/timer-store';

interface TimerProps {
    id: string;
    durationSeconds: number;
    label: string;
    onComplete: () => void;
    onCancel: () => void;
}

export function TimerOverlay() {
    const { timers, removeTimer } = useTimerStore();

    if (timers.length === 0) return null;

    return (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-4 items-end pointer-events-none">
            {timers.map((timer) => (
                <div key={timer.id} className="pointer-events-auto">
                    <Timer
                        id={timer.id}
                        durationSeconds={timer.durationSeconds} // Pass the original duration
                        label={timer.label}
                        onComplete={() => {
                            // Optional: auto-remove after some time?
                            // For now, let user close it
                        }}
                        onCancel={() => removeTimer(timer.id)}
                    />
                </div>
            ))}
        </div>
    );
}

export function Timer({ id, durationSeconds, label, onComplete, onCancel }: TimerProps) {
    const [remaining, setRemaining] = useState(durationSeconds);
    const [isRunning, setIsRunning] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!isRunning || remaining <= 0) return;

        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    setIsRunning(false);
                    setIsComplete(true);
                    onComplete();
                    // Play audio alert
                    playAlert();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, remaining, onComplete]);

    const playAlert = useCallback(() => {
        // Create a simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.5;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);

            // Beep again
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                osc2.connect(gainNode);
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                osc2.start();
                osc2.stop(audioContext.currentTime + 0.5);
            }, 600);
        } catch (e) {
            console.warn('Could not play audio alert:', e);
        }
    }, []);

    const progress = ((durationSeconds - remaining) / durationSeconds) * 100;
    const circumference = 2 * Math.PI * 54; // radius = 54
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const handleRestart = () => {
        setRemaining(durationSeconds);
        setIsRunning(true);
        setIsComplete(false);
    };

    // Format time as MM:SS or HH:MM:SS
    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`rounded-2xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 ${isComplete
                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/50'
                : 'bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20'
                }`}
            style={{ minWidth: '200px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-base capitalize">{label}</span>
                <button
                    onClick={onCancel}
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close timer"
                >
                    <X className="w-4 h-4 opacity-60" />
                </button>
            </div>

            {/* Circular Timer */}
            <div className="flex justify-center mb-4">
                <div className="relative">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        {/* Background circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="opacity-10"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke={isComplete ? '#22c55e' : remaining <= 10 ? '#ef4444' : '#f97316'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    {/* Time display in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span
                            className={`font-mono text-2xl font-bold tracking-tight ${isComplete ? 'text-green-500' : remaining <= 10 ? 'text-red-500' : ''
                                }`}
                        >
                            {formatTime(remaining)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
                {!isComplete ? (
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-3 rounded-full transition-all duration-200 ${isRunning
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-orange-500/20'
                            }`}
                        aria-label={isRunning ? 'Pause' : 'Resume'}
                    >
                        {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={handleRestart}
                            className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-green-500/20 transition-colors"
                            aria-label="Restart timer"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={playAlert}
                            className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-green-500/20 transition-colors"
                            aria-label="Play sound"
                        >
                            <Volume2 className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            {isComplete && (
                <p className="text-center text-green-500 font-medium mt-3 text-sm animate-pulse">
                    ¡Listo! / Done!
                </p>
            )}
        </div>
    );
}

