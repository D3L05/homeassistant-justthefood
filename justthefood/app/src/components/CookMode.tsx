'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { X, ChefHat, ArrowLeft, Clock, Play, Home, CheckCircle2, Timer as TimerIcon, Pencil, Save, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Timer } from './Timer';
import { parseTimers, formatDuration } from '@/lib/timer-parser';
import type { Recipe, TimerInfo, ActiveTimer } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CookModeProps {
    recipe: Recipe;
    recipeId?: string;
    config: {
        timerMode: 'home_assistant' | 'built_in';
        notificationService: string;
        ttsEnabled: boolean;
        ttsService: string;
        ttsEntity: string;
    };
    apiBasePath?: string;
    onClose: () => void;
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&#8217;': "'",
        '&#8216;': "'",
        '&#8220;': '"',
        '&#8221;': '"',
        '&#176;': '°',
    };

    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.replaceAll(entity, char);
    }
    // Handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
    return decoded;
}

/**
 * Scale ingredient quantities by a multiplier
 */
function scaleIngredient(ingredient: string, multiplier: number): string {
    if (multiplier === 1) return ingredient;

    const numberPattern = /^((\d+\s+)?(\d+\/\d+)|\d+\.?\d*)/;
    const match = ingredient.match(numberPattern);

    if (!match) return ingredient;

    const matchedPart = match[0];
    const rest = ingredient.slice(matchedPart.length);
    let value = 0;

    if (matchedPart.includes('/')) {
        const parts = matchedPart.trim().split(/\s+/);
        for (const part of parts) {
            if (part.includes('/')) {
                const [num, denom] = part.split('/').map(Number);
                value += num / denom;
            } else {
                value += Number(part);
            }
        }
    } else {
        value = parseFloat(matchedPart);
    }

    if (isNaN(value)) return ingredient;

    const scaled = value * multiplier;
    return formatIngredientNumber(scaled) + rest;
}

function formatIngredientNumber(n: number): string {
    const fractions: Record<number, string> = {
        0.25: '1/4', 0.33: '1/3', 0.5: '1/2', 0.67: '2/3', 0.75: '3/4',
    };

    const whole = Math.floor(n);
    const decimal = n - whole;

    for (const [val, str] of Object.entries(fractions)) {
        if (Math.abs(decimal - parseFloat(val)) < 0.05) {
            return whole > 0 ? `${whole} ${str}` : str;
        }
    }

    if (n % 1 === 0) return n.toString();
    return n.toFixed(1).replace(/\.0$/, '');
}

export function CookMode({ recipe, recipeId, config, apiBasePath = '', onClose }: CookModeProps) {
    // Recipe state (might be updated)
    const [currentRecipe, setCurrentRecipe] = useState(recipe);

    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [scale, setScale] = useState<1 | 2>(1);
    const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
    const [instructionTimers, setInstructionTimers] = useState<TimerInfo[][]>([]);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(recipe.title);
    const [editIngredients, setEditIngredients] = useState([...recipe.ingredients]);
    const [editInstructions, setEditInstructions] = useState([...recipe.instructions]);
    const [isSaving, setIsSaving] = useState(false);

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
    }, []);

    useEffect(() => {
        const regexTimers = currentRecipe.instructions.map((instruction) => parseTimers(instruction));
        setInstructionTimers(regexTimers);

        const tryAIFallback = async () => {
            const updates: { index: number; timers: TimerInfo[] }[] = [];

            for (let i = 0; i < currentRecipe.instructions.length; i++) {
                if (regexTimers[i].length === 0) {
                    try {
                        const res = await fetch(`${apiBasePath}api/timer/parse`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ instruction: currentRecipe.instructions[i] }),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.timers && data.timers.length > 0) {
                                updates.push({ index: i, timers: data.timers });
                            }
                        }
                    } catch (e) {
                        // AI fallback failed
                    }
                }
            }

            if (updates.length > 0) {
                setInstructionTimers((prev) => {
                    const next = [...prev];
                    for (const { index, timers } of updates) {
                        next[index] = timers;
                    }
                    return next;
                });
            }
        };

        const hasMissingTimers = regexTimers.some((t) => t.length === 0);
        if (hasMissingTimers) {
            tryAIFallback();
        }
    }, [currentRecipe.instructions, apiBasePath]);

    const scaledIngredients = useMemo(() => {
        return currentRecipe.ingredients.map((ing) => decodeHtmlEntities(scaleIngredient(ing, scale)));
    }, [currentRecipe.ingredients, scale]);

    const decodedInstructions = useMemo(() => {
        return currentRecipe.instructions.map(decodeHtmlEntities);
    }, [currentRecipe.instructions]);

    const toggleIngredient = (index: number) => {
        setCheckedIngredients((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const toggleStep = (index: number) => {
        setCompletedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const startTimer = async (stepIndex: number, timer: TimerInfo) => {
        if (config.timerMode === 'home_assistant') {
            try {
                const res = await fetch(`${apiBasePath}api/timer/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        durationSeconds: timer.durationSeconds,
                        label: timer.label,
                        stepIndex,
                    }),
                });
                if (res.ok) {
                    showToast(`⏲️ Timer started: ${formatDuration(timer.durationSeconds)}`);
                } else {
                    console.error('HA timer failed, falling back to built-in');
                    addBuiltInTimer(stepIndex, timer);
                    showToast('⚠️ HA timer failed — using built-in timer');
                }
            } catch (e) {
                console.error('Failed to start HA timer:', e);
                addBuiltInTimer(stepIndex, timer);
            }
        } else {
            addBuiltInTimer(stepIndex, timer);
        }
    };

    const addBuiltInTimer = (stepIndex: number, timer: TimerInfo) => {
        const newTimer: ActiveTimer = {
            id: `${stepIndex}-${Date.now()}`,
            stepIndex,
            durationSeconds: timer.durationSeconds,
            startedAt: Date.now(),
            label: timer.label,
        };
        setActiveTimers((prev) => [...prev, newTimer]);
    };

    const removeTimer = (timerId: string) => {
        setActiveTimers((prev) => prev.filter((t) => t.id !== timerId));
    };

    const handleTimerComplete = async (timer: ActiveTimer) => {
        if (config.notificationService) {
            try {
                await fetch(`${apiBasePath}api/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `${timer.label} timer is done!`,
                    }),
                });
            } catch (e) {
                console.error('Failed to send notification:', e);
            }
        }
    };

    // Edit Mode Handlers
    const enterEditMode = () => {
        setEditTitle(currentRecipe.title);
        setEditIngredients([...currentRecipe.ingredients]);
        setEditInstructions([...currentRecipe.instructions]);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
    };

    const saveEdit = async () => {
        if (!recipeId) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${apiBasePath}api/recipes/${recipeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    ingredients: editIngredients.filter(i => i.trim()),
                    instructions: editInstructions.filter(i => i.trim()),
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setCurrentRecipe(prev => ({
                    ...prev,
                    title: editTitle,
                    ingredients: editIngredients.filter(i => i.trim()),
                    instructions: editInstructions.filter(i => i.trim()),
                }));
                setIsEditing(false);
                // Optionally reset progress if desired, but user might want to keep it
                showToast('✅ Recipe updated!');
            } else {
                showToast('❌ Failed to save changes');
            }
        } catch (error) {
            console.error('Failed to save recipe:', error);
            showToast('❌ Error saving recipe');
        } finally {
            setIsSaving(false);
        }
    };

    const updateIngredient = (index: number, value: string) => {
        setEditIngredients(prev => { const next = [...prev]; next[index] = value; return next; });
    };

    const addIngredient = () => {
        setEditIngredients(prev => [...prev, '']);
    };

    const removeIngredient = (index: number) => {
        setEditIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const updateInstruction = (index: number, value: string) => {
        setEditInstructions(prev => { const next = [...prev]; next[index] = value; return next; });
    };

    const addInstruction = () => {
        setEditInstructions(prev => [...prev, '']);
    };

    const removeInstruction = (index: number) => {
        setEditInstructions(prev => prev.filter((_, i) => i !== index));
    };


    const progress = {
        ingredients: (checkedIngredients.size / currentRecipe.ingredients.length) * 100,
        steps: (completedSteps.size / currentRecipe.instructions.length) * 100,
    };

    return (
        <div className="fixed inset-0 z-50 bg-background overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-orange-100 dark:border-zinc-700 px-4 py-3 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={isEditing ? cancelEdit : onClose}
                        className="p-2.5 hover:bg-orange-100 dark:hover:bg-zinc-700 rounded-xl transition-all duration-200 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/25">
                            <ChefHat className="w-5 h-5 text-white" />
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="font-bold bg-transparent border-b-2 border-orange-500 outline-none text-center max-w-[200px] text-gray-900 dark:text-white"
                                placeholder="Recipe Title"
                            />
                        ) : (
                            <h1 className="font-bold text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-none text-lg">
                                {decodeHtmlEntities(currentRecipe.title)}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={saveEdit}
                                disabled={isSaving}
                                className="p-2.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 active:scale-95 text-green-600"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            </button>
                        ) : recipeId ? (
                            <button
                                onClick={enterEditMode}
                                className="p-2.5 hover:bg-orange-100 dark:hover:bg-zinc-700 rounded-xl transition-all duration-200 active:scale-95 text-gray-600 dark:text-gray-300"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                        ) : null}

                        {!isEditing && (
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 active:scale-95"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
                    <div className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl shadow-black/20 border border-orange-200 dark:border-zinc-600">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Active Timers Panel */}
            {activeTimers.length > 0 && (
                <div className="fixed top-20 right-4 z-20 w-72 space-y-3">
                    {activeTimers.map((timer) => (
                        <Timer
                            key={timer.id}
                            id={timer.id}
                            durationSeconds={timer.durationSeconds}
                            label={timer.label}
                            onComplete={() => handleTimerComplete(timer)}
                            onCancel={() => removeTimer(timer.id)}
                        />
                    ))}
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-28 overflow-y-auto h-[calc(100vh-140px)]">
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Ingredients Panel */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-xl shadow-orange-500/5 border border-orange-100 dark:border-zinc-700">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-xl text-gray-900 dark:text-white">Ingredients</h2>
                            <div className="flex items-center gap-1 bg-orange-100 dark:bg-zinc-700 rounded-xl p-1">
                                <button
                                    onClick={() => setScale(1)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                        scale === 1
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-zinc-600'
                                    )}
                                >
                                    1x
                                </button>
                                <button
                                    onClick={() => setScale(2)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                        scale === 2
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-zinc-600'
                                    )}
                                >
                                    2x
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-orange-100 dark:bg-zinc-700 rounded-full mb-5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progress.ingredients}%` }}
                            />
                        </div>

                        <ul className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
                            {isEditing ? (
                                <>
                                    {editIngredients.map((ingredient, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={ingredient}
                                                onChange={(e) => updateIngredient(index, e.target.value)}
                                                className="flex-1 bg-gray-50 dark:bg-zinc-700/50 border border-transparent focus:border-orange-500 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none"
                                            />
                                            <button
                                                onClick={() => removeIngredient(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                    <li>
                                        <button
                                            onClick={addIngredient}
                                            className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add ingredient
                                        </button>
                                    </li>
                                </>
                            ) : (
                                scaledIngredients.map((ingredient, index) => (
                                    <li
                                        key={index}
                                        onClick={() => toggleIngredient(index)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                                            checkedIngredients.has(index)
                                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                                : 'bg-gray-50 dark:bg-zinc-700/50 border border-transparent hover:bg-orange-50 dark:hover:bg-zinc-700 hover:border-orange-200 dark:hover:border-orange-800'
                                        )}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                                            checkedIngredients.has(index)
                                                ? 'bg-green-500 text-white'
                                                : 'border-2 border-gray-300 dark:border-gray-500'
                                        )}>
                                            {checkedIngredients.has(index) && (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "flex-1 transition-all duration-200",
                                            checkedIngredients.has(index)
                                                ? 'line-through text-gray-400 dark:text-gray-500'
                                                : 'text-gray-700 dark:text-gray-200'
                                        )}>
                                            {ingredient}
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    {/* Steps Panel */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-xl shadow-orange-500/5 border border-orange-100 dark:border-zinc-700">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-xl text-gray-900 dark:text-white">Instructions</h2>
                            {config.timerMode === 'home_assistant' && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                                    <Home className="w-3.5 h-3.5" />
                                    HA Timers
                                </span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-orange-100 dark:bg-zinc-700 rounded-full mb-5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progress.steps}%` }}
                            />
                        </div>

                        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
                            {isEditing ? (
                                <>
                                    {editInstructions.map((step, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-orange-100 text-orange-600 mt-1">
                                                {index + 1}
                                            </span>
                                            <textarea
                                                value={step}
                                                onChange={(e) => updateInstruction(index, e.target.value)}
                                                className="flex-1 bg-gray-50 dark:bg-zinc-700/50 border border-transparent focus:border-orange-500 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none resize-y min-h-[80px]"
                                            />
                                            <button
                                                onClick={() => removeInstruction(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors mt-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addInstruction}
                                        className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add step
                                    </button>
                                </>
                            ) : (
                                decodedInstructions.map((step, index) => {
                                    const timers = instructionTimers[index] || [];
                                    const hasTimers = timers.length > 0;

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all duration-300",
                                                completedSteps.has(index)
                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60'
                                                    : 'bg-gray-50 dark:bg-zinc-700/50 border-transparent hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-lg hover:shadow-orange-500/10'
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => toggleStep(index)}
                                                    className={cn(
                                                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 active:scale-90",
                                                        completedSteps.has(index)
                                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                            : 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                                    )}
                                                >
                                                    {completedSteps.has(index) ? '✓' : index + 1}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{step}</p>

                                                    {/* Timer buttons */}
                                                    {hasTimers && !completedSteps.has(index) && (
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            {timers.map((timer, timerIdx) => (
                                                                <button
                                                                    key={timerIdx}
                                                                    onClick={() => startTimer(index, timer)}
                                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200 active:scale-95"
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                    {formatDuration(timer.durationSeconds)}
                                                                    <Play className="w-3.5 h-3.5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Progress */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-orange-100 dark:border-zinc-700 p-4 shadow-2xl shadow-black/10">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-orange-500">{checkedIngredients.size}</span>/{currentRecipe.ingredients.length} ingredients
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-orange-500">{completedSteps.size}</span>/{currentRecipe.instructions.length} steps
                            </span>
                        </div>
                        {progress.steps === 100 && (
                            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-semibold text-sm animate-fade-in">
                                🎉 Recipe complete!
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
