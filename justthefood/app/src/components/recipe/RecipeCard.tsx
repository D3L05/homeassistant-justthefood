'use client';

import { useState } from 'react';
import { Clock, Users, ChefHat, ExternalLink, Heart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Recipe } from '@/lib/types';

interface RecipeCardProps {
    recipe: Recipe;
    onStartCooking: () => void;
}

export function RecipeCard({ recipe, onStartCooking }: RecipeCardProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = async () => {
        if (isSaved) return;

        setIsSaving(true);
        try {
            const res = await fetch('api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: recipe.source || window.location.href, // Fallback if source missing
                    ...recipe
                }),
            });

            if (res.ok) {
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Failed to save', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto overflow-hidden shadow-2xl border-0 bg-card rounded-3xl ring-1 ring-black/5">
            {/* Hero Image */}
            {recipe.image && (
                <div className="relative h-64 overflow-hidden">
                    <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <h2 className="absolute bottom-6 left-6 right-6 text-3xl font-heading font-bold text-white drop-shadow-xl leading-tight">
                        {recipe.title}
                    </h2>
                </div>
            )}

            <CardHeader className={recipe.image ? 'pt-4' : ''}>
                {!recipe.image && (
                    <h2 className="text-2xl font-bold text-foreground">{recipe.title}</h2>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {recipe.prepTime && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Prep: {recipe.prepTime}</span>
                        </div>
                    )}
                    {recipe.cookTime && (
                        <div className="flex items-center gap-1.5">
                            <ChefHat className="w-4 h-4" />
                            <span>Cook: {recipe.cookTime}</span>
                        </div>
                    )}
                    {recipe.totalTime && !recipe.prepTime && !recipe.cookTime && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Total: {recipe.totalTime}</span>
                        </div>
                    )}
                    {recipe.servings && (
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{recipe.servings} servings</span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {recipe.summary && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {recipe.summary}
                    </p>
                )}

                {/* Ingredients Preview */}
                <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                        Ingredients ({recipe.ingredients.length})
                    </h3>
                    <ul className="text-sm space-y-1">
                        {recipe.ingredients.slice(0, 5).map((ingredient, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <span>{ingredient}</span>
                            </li>
                        ))}
                        {recipe.ingredients.length > 5 && (
                            <li className="text-muted-foreground italic">
                                +{recipe.ingredients.length - 5} more...
                            </li>
                        )}
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <Button
                        onClick={onStartCooking}
                        className="flex-1 h-12 text-lg font-heading font-bold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105"
                    >
                        <ChefHat className="w-5 h-5 mr-2" />
                        Start Cooking
                    </Button>

                    <Button
                        variant="outline"
                        className={`h-12 w-12 rounded-full border-2 ${isSaved ? 'text-primary border-primary bg-primary/5' : 'border-input hover:border-primary hover:text-primary transition-colors'}`}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                        )}
                    </Button>

                    {recipe.source && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            asChild
                        >
                            <a href={recipe.source} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
