import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveTimer {
    id: string;
    label: string;
    durationSeconds: number;
    startedAt: number; // Timestamp when the timer started
}

interface TimerState {
    timers: ActiveTimer[];
    addTimer: (timer: Omit<ActiveTimer, 'startedAt'>) => void;
    removeTimer: (id: string) => void;
    clearTimers: () => void;
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set) => ({
            timers: [],
            addTimer: (timer) => set((state) => ({
                timers: [...state.timers, { ...timer, startedAt: Date.now() }]
            })),
            removeTimer: (id) => set((state) => ({
                timers: state.timers.filter((t) => t.id !== id)
            })),
            clearTimers: () => set({ timers: [] }),
        }),
        {
            name: 'timer-storage',
        }
    )
);
