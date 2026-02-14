'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const EMOJI_OPTIONS = [
    // Proteins & Meats
    '🍗', '🍖', '🥩', '🥓', '🐟', '🦐', '🦞', '🐔',
    // Main dishes
    '🍕', '🍔', '🌮', '🌯', '🍣', '🍜', '🍝', '🍲',
    '🥘', '🫕', '🥙', '🍱', '🍛', '🥟', '🫔', '🥪',
    // Sides & Basics
    '🍚', '🍞', '🥐', '🥖', '🧀', '🥚', '🥗', '🫒',
    // Breakfast & Sweets
    '🥞', '🍳', '🧇', '🍰', '🎂', '🍪', '🧁', '🍩',
    '🍫', '🍮', '🍦', '🧈',
    // Fruits
    '🍎', '🍌', '🍊', '🍋', '🍓', '🫐', '🍇', '🥭',
    '🍑', '🍍', '🥝', '🍒', '🥥', '🍉',
    // Vegetables
    '🥑', '🥕', '🌽', '🫑', '🌶️', '🥦', '🧅', '🧄',
    '🍄', '🥬', '🍆',
    // Drinks
    '☕', '🍷', '🥤', '🧃', '🍵', '🥛', '🍺', '🧉',
    // General
    '📁', '❤️', '⭐', '🔥', '✨', '🎉', '💚', '🏠', '📌',
];

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + 8, // 8px gap
                    left: rect.left
                });
            }
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg shrink-0"
                title="Choose emoji"
            >
                {value}
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 w-64 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    <div className="grid grid-cols-8 gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    onChange(emoji);
                                    setIsOpen(false);
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${value === emoji ? 'bg-orange-100 dark:bg-orange-900/30 ring-1 ring-orange-400' : ''
                                    }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
