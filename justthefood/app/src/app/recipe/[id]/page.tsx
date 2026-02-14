'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChefHat, Clock, Users, ExternalLink, Loader2 } from 'lucide-react';
import { CookMode } from '@/components/CookMode';
import type { Recipe } from '@/lib/types';
import type { AddonConfig } from '@/lib/addon-config';

export default function RecipeDetailPage() {
    const params = useParams();
    const [recipe, setRecipe] = useState<(Recipe & { id: string }) | null>(null);
    const [config, setConfig] = useState<AddonConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCookMode, setIsCookMode] = useState(false);

    useEffect(() => {
        const id = params.id as string;

        Promise.all([
            fetch(`../api/recipes/${id}`).then(r => r.json()),
            fetch('../api/config').then(r => r.json())
        ])
            .then(([recipeData, configData]) => {
                if (recipeData.error) {
                    setError(recipeData.error);
                } else {
                    setRecipe(recipeData);
                    setConfig(configData);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load recipe:', err);
                setError('Failed to load recipe');
                setLoading(false);
            });
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col items-center justify-center">
                <p className="text-red-500 mb-4">{error || 'Recipe not found'}</p>
                <Link href="../saved" className="text-orange-500 hover:underline">
                    Back to recipes
                </Link>
            </div>
        );
    }

    if (isCookMode && config) {
        return (
            <CookMode
                recipe={recipe}
                recipeId={recipe.id}
                config={config}
                apiBasePath="../"
                onClose={() => setIsCookMode(false)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-orange-100 px-4 py-3 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="../saved" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                        {recipe.title}
                    </h1>
                    <div className="w-9" /> {/* Spacer */}
                </div>
            </header>

            {/* Main */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Hero Image */}
                    {recipe.image && (
                        <div className="relative h-72 overflow-hidden">
                            <img
                                src={recipe.image}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <h2 className="absolute bottom-4 left-4 right-4 text-3xl font-bold text-white">
                                {recipe.title}
                            </h2>
                        </div>
                    )}

                    <div className="p-6">
                        {!recipe.image && (
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                {recipe.title}
                            </h2>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            {recipe.prepTime && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                    <Clock className="w-4 h-4" />
                                    Prep: {recipe.prepTime}
                                </span>
                            )}
                            {recipe.cookTime && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                    <ChefHat className="w-4 h-4" />
                                    Cook: {recipe.cookTime}
                                </span>
                            )}
                            {recipe.servings && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                    <Users className="w-4 h-4" />
                                    {recipe.servings}
                                </span>
                            )}
                        </div>

                        {recipe.summary && (
                            <p className="text-gray-600 mb-6 leading-relaxed">{recipe.summary}</p>
                        )}

                        {/* Ingredients */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h3>
                            <ul className="grid sm:grid-cols-2 gap-2">
                                {recipe.ingredients.map((ing, i) => (
                                    <li key={i} className="flex gap-2 text-gray-700">
                                        <span className="text-orange-500 mt-0.5">•</span>
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Instructions</h3>
                            <ol className="space-y-4">
                                {recipe.instructions.map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                            {i + 1}
                                        </span>
                                        <p className="text-gray-700 leading-relaxed">{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsCookMode(true)}
                                className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                            >
                                <ChefHat className="w-5 h-5" />
                                Start Cooking
                            </button>

                            {recipe.source && (
                                <a
                                    href={recipe.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
