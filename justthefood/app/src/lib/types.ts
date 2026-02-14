// Recipe type definitions

export interface TimerInfo {
    durationSeconds: number;
    label: string;
    originalText: string;
}

export interface Recipe {
    title: string;
    summary?: string;
    image?: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    servings?: string;
    ingredients: string[];
    instructions: string[];
    source?: string;
}

export interface ExtractionResult {
    success: boolean;
    recipe?: Recipe;
    error?: string;
    strategy?: 'json-ld' | 'llm' | 'heuristics';
}

export interface CookingSessionState {
    completedSteps: number[];
    checkedIngredients: number[];
    scale: number;
    activeTimers: ActiveTimer[];
}

export interface ActiveTimer {
    id: string;
    stepIndex: number;
    durationSeconds: number;
    startedAt: number; // timestamp
    label: string;
}
