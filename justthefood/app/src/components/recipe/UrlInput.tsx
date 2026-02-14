'use client';

import { useState } from 'react';
import { Search, Loader2, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UrlInputProps {
    onSubmit: (url: string) => void;
    isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading = false }: UrlInputProps) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            setError('Please enter a URL');
            return;
        }

        try {
            const parsedUrl = new URL(trimmedUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                setError('Please enter a valid HTTP or HTTPS URL');
                return;
            }
            onSubmit(trimmedUrl);
        } catch {
            setError('Please enter a valid URL');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-lg group cursor-default">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8 text-white transition-transform group-hover:animate-wave"
                        aria-hidden="true"
                    >
                        <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" />
                        <path d="M6 17h12" />
                    </svg>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                    Just The Food
                </h1>
                <p className="text-muted-foreground text-lg">
                    Paste a recipe URL to extract just the recipe — no ads, no life stories.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="url"
                        placeholder="https://www.foodblog.com/amazing-recipe..."
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setError(null);
                        }}
                        className="pl-12 pr-4 h-14 text-lg rounded-full border-2 focus-visible:ring-orange-500 shadow-sm"
                        disabled={isLoading}
                    />
                </div>

                {error && (
                    <p className="text-destructive text-sm text-center">{error}</p>
                )}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-lg font-semibold rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md transition-all hover:shadow-lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Extracting Recipe...
                        </>
                    ) : (
                        <>
                            <ChefHat className="w-5 h-5 mr-2" />
                            Get Recipe
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
