'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { UrlInput, RecipeCard, CookMode } from '@/components/recipe';
import type { Recipe, ExtractionResult } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCookMode, setIsCookMode] = useState(false);

  const handleExtract = async (url: string) => {
    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const res = await fetch('api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data: ExtractionResult = await res.json();

      if (data.success && data.recipe) {
        setRecipe({ ...data.recipe, source: url });
      } else {
        // Handle specific error cases with friendly messages
        const rawError = data.error || '';
        if (rawError.includes('Failed to fetch') || rawError.includes('Network')) {
          setError("We couldn't reach that site. It might be offline or blocking our access. 😔");
        } else if (rawError.includes('Invalid URL')) {
          setError("That doesn't look like a valid URL. Please check it and try again. 🔗");
        } else {
          setError("We couldn't find a recipe on that page. Are you sure it's a recipe? 🤔");
        }
      }
    } catch (e) {
      setError("Something went wrong on our end. Please try again later. 🛠️");
    } finally {
      setLoading(false);
    }
  };

  // Full-screen cook mode
  if (isCookMode && recipe) {
    return <CookMode recipe={recipe} onClose={() => setIsCookMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="absolute top-0 right-0 p-4 z-10 flex items-center gap-3">
        <a href="saved">
          <Button variant="secondary" className="rounded-full shadow-sm bg-white/50 backdrop-blur-sm hover:bg-white text-orange-600 border border-orange-100">
            <BookOpen className="w-4 h-4 mr-2" />
            My Recipes
          </Button>
        </a>
      </header>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200/30 rounded-full blur-3xl" />
      </div>

      <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {!recipe ? (
          <>
            <UrlInput onSubmit={handleExtract} isLoading={loading} />

            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center max-w-md">
                {error}
              </div>
            )}

            {/* Feature highlights */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
              <FeatureCard
                emoji="🚫"
                title="No Ads"
                description="Just the recipe, nothing else"
              />
              <FeatureCard
                emoji="📖"
                title="No Life Story"
                description="Skip straight to instructions"
              />
              <FeatureCard
                emoji="👨‍🍳"
                title="Cook Mode"
                description="Large text, track your progress"
              />
            </div>
          </>
        ) : (
          <div className="w-full space-y-4">
            <button
              onClick={() => setRecipe(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Try another recipe
            </button>
            <RecipeCard recipe={recipe} onStartCooking={() => setIsCookMode(true)} />
          </div>
        )}
      </main>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-white/50 backdrop-blur border border-orange-100 shadow-sm">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
