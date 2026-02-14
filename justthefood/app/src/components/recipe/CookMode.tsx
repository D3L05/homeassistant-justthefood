'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, ChefHat, ArrowLeft, TimerIcon, Pencil, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

import { parseTimers, formatDuration } from '@/lib/timer-parser';
import type { Recipe } from '@/lib/types';
import type { TimerInfo } from '@/lib/types';
import { useTimerStore } from '@/lib/store/timer-store';

interface CookModeProps {
    recipe: Recipe;
    recipeId?: string;
    onClose: () => void;
}

/**
 * Scale ingredient quantities by a multiplier
 * Handles various number formats: "2 cups", "1/2 tsp", "1 1/2 cups", etc.
 */
function scaleIngredient(ingredient: string, multiplier: number): string {
    if (multiplier === 1) return ingredient;

    // Match numbers at the start, including fractions like "1/2" or mixed like "1 1/2"
    const numberPattern = /^((\d+\s+)?(\d+\/\d+)|\d+\.?\d*)/;
    const match = ingredient.match(numberPattern);

    if (!match) return ingredient;

    const matchedPart = match[0];
    const rest = ingredient.slice(matchedPart.length);

    // Parse the number (handles fractions and mixed numbers)
    let value = 0;

    if (matchedPart.includes('/')) {
        // Handle fractions like "1/2" or "1 1/2"
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

    // Format nicely - prefer fractions for common values
    const formatted = formatNumber(scaled);

    return formatted + rest;
}

function formatNumber(n: number): string {
    // Handle common fractions
    const fractions: Record<number, string> = {
        0.25: '1/4',
        0.33: '1/3',
        0.5: '1/2',
        0.67: '2/3',
        0.75: '3/4',
    };

    const whole = Math.floor(n);
    const decimal = n - whole;

    // Check for common fractions
    for (const [val, str] of Object.entries(fractions)) {
        if (Math.abs(decimal - parseFloat(val)) < 0.05) {
            return whole > 0 ? `${whole} ${str}` : str;
        }
    }

    // Otherwise just format as a reasonable decimal
    if (n % 1 === 0) {
        return n.toString();
    }
    return n.toFixed(1).replace(/\.0$/, '');
}

export function CookMode({ recipe, recipeId, onClose }: CookModeProps) {
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [scale, setScale] = useState<1 | 2>(1);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(recipe.title);
    const [editIngredients, setEditIngredients] = useState([...recipe.ingredients]);
    const [editInstructions, setEditInstructions] = useState([...recipe.instructions]);
    const [isSaving, setIsSaving] = useState(false);

    // Current recipe data (may be updated after save)
    const [currentRecipe, setCurrentRecipe] = useState(recipe);

    // Global timer store
    const { addTimer, timers } = useTimerStore();

    const scaledIngredients = useMemo(() => {
        return currentRecipe.ingredients.map(ing => scaleIngredient(ing, scale));
    }, [currentRecipe.ingredients, scale]);

    // Parse timers from each instruction step
    const stepTimers = useMemo(() => {
        return currentRecipe.instructions.map(step => parseTimers(step));
    }, [currentRecipe.instructions]);

    const toggleIngredient = (index: number) => {
        setCheckedIngredients(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const toggleStep = (index: number) => {
        setCompletedSteps(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const startTimer = useCallback((timer: TimerInfo, stepIndex: number) => {
        const id = `timer-${stepIndex}-${Date.now()}`;
        addTimer({
            id,
            durationSeconds: timer.durationSeconds,
            label: `Step ${stepIndex + 1}: ${timer.label}`,
        });
    }, [addTimer]);

    // Edit mode handlers
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
            const res = await fetch(`../api/recipes/${recipeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    ingredients: editIngredients.filter(i => i.trim()),
                    instructions: editInstructions.filter(i => i.trim()),
                }),
            });
            if (res.ok) {
                setCurrentRecipe(prev => ({
                    ...prev,
                    title: editTitle,
                    ingredients: editIngredients.filter(i => i.trim()),
                    instructions: editInstructions.filter(i => i.trim()),
                }));
                setIsEditing(false);
                setCheckedIngredients(new Set());
                setCompletedSteps(new Set());
            }
        } catch (error) {
            console.error('Failed to save recipe:', error);
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
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={isEditing ? cancelEdit : onClose}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-orange-500" />
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="font-semibold bg-transparent border-b-2 border-orange-500 outline-none text-center max-w-[200px] sm:max-w-none"
                            />
                        ) : (
                            <h1 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                                {currentRecipe.title}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {isEditing ? (
                            <Button variant="ghost" size="icon" onClick={saveEdit} disabled={isSaving} title="Save changes">
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-green-600" />}
                            </Button>
                        ) : recipeId ? (
                            <Button variant="ghost" size="icon" onClick={enterEditMode} title="Edit recipe">
                                <Pencil className="w-4 h-4" />
                            </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 pb-24">
                <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
                    {/* Ingredients Panel */}
                    <div className="bg-card rounded-xl p-6 shadow-sm border h-fit lg:sticky lg:top-20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-xl">Ingredients</h2>

                            {/* Scale Toggle */}
                            <div className="flex items-center gap-2 text-sm">
                                <span className={scale === 1 ? 'font-medium' : 'text-muted-foreground'}>1x</span>
                                <Switch
                                    checked={scale === 2}
                                    onCheckedChange={(checked) => setScale(checked ? 2 : 1)}
                                />
                                <span className={scale === 2 ? 'font-medium' : 'text-muted-foreground'}>2x</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
                                style={{ width: `${progress.ingredients}%` }}
                            />
                        </div>

                        <ScrollArea className="h-[calc(100vh-250px)]">
                            {isEditing ? (
                                <ul className="space-y-2 pr-4">
                                    {editIngredients.map((ingredient, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={ingredient}
                                                onChange={(e) => updateIngredient(index, e.target.value)}
                                                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-orange-500/50"
                                            />
                                            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => removeIngredient(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </li>
                                    ))}
                                    <li>
                                        <Button type="button" variant="outline" size="sm" className="gap-1 mt-1" onClick={addIngredient}>
                                            <Plus className="w-3 h-3" /> Add ingredient
                                        </Button>
                                    </li>
                                </ul>
                            ) : (
                                <ul className="space-y-4 pr-4">
                                    {scaledIngredients.map((ingredient, index) => (
                                        <li key={index} className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                            <Checkbox
                                                id={`ingredient-${index}`}
                                                checked={checkedIngredients.has(index)}
                                                onCheckedChange={() => toggleIngredient(index)}
                                                className="mt-1 w-5 h-5 border-2"
                                            />
                                            <label
                                                htmlFor={`ingredient-${index}`}
                                                className={`cursor-pointer transition-all text-lg leading-snug ${checkedIngredients.has(index)
                                                    ? 'line-through text-muted-foreground'
                                                    : ''
                                                    }`}
                                            >
                                                {ingredient}
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Steps Panel */}
                    <div className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="font-semibold text-xl mb-6">Instructions</h2>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
                                style={{ width: `${progress.steps}%` }}
                            />
                        </div>

                        <div className="space-y-6">
                            {isEditing ? (
                                <>
                                    {editInstructions.map((step, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm mt-1">
                                                {index + 1}
                                            </span>
                                            <textarea
                                                value={step}
                                                onChange={(e) => updateInstruction(index, e.target.value)}
                                                rows={3}
                                                className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-orange-500/50 resize-y"
                                            />
                                            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 mt-1" onClick={() => removeInstruction(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addInstruction}>
                                        <Plus className="w-3 h-3" /> Add step
                                    </Button>
                                </>
                            ) : (
                                currentRecipe.instructions.map((step, index) => (
                                    <div
                                        key={index}
                                        onClick={() => toggleStep(index)}
                                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${completedSteps.has(index)
                                            ? 'opacity-50 bg-muted/30 border-transparent hover:opacity-75'
                                            : 'bg-background border-muted hover:border-orange-500/50 shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start gap-5">
                                            <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${completedSteps.has(index)
                                                ? 'bg-muted text-muted-foreground'
                                                : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                                                }`}>
                                                {index + 1}
                                            </span>
                                            <div className="space-y-4 w-full">
                                                <p className="text-xl md:text-2xl leading-relaxed font-medium text-foreground/90">{step}</p>

                                                {/* Timer buttons for this step */}
                                                {stepTimers[index].length > 0 && !completedSteps.has(index) && (
                                                    <div className="flex flex-wrap gap-3 pt-2">
                                                        {stepTimers[index].map((timer, timerIdx) => (
                                                            <button
                                                                key={timerIdx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startTimer(timer, index);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 transition-all shadow-sm hover:shadow"
                                                            >
                                                                <TimerIcon className="w-4 h-4" />
                                                                {timer.label} · {formatDuration(timer.durationSeconds)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>



            {/* Bottom Progress */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            {checkedIngredients.size}/{currentRecipe.ingredients.length} ingredients • {completedSteps.size}/{currentRecipe.instructions.length} steps
                            {timers.length > 0 && ` • ${timers.length} ⏱️`}
                        </span>
                        {progress.steps === 100 && (
                            <span className="text-green-500 font-medium">🎉 Recipe complete!</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
