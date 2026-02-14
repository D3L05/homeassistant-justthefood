'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, MoreVertical, Folder, Trash2, Edit2, Clock, Users, Check, Loader2, ArrowLeft, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SavedRecipe, Collection } from '@/lib/db';
import { EmojiPicker } from '@/components/saved/EmojiPicker';

type CollectionWithCount = Collection & {
    recipeCount: number;
    // Map main app structure for compatibility if needed, but we use recipeCount
};

type RecipeWithCollections = SavedRecipe & {
    collectionIds: string[];
};

export default function SavedRecipesPage() {
    const [recipes, setRecipes] = useState<RecipeWithCollections[]>([]);
    const [collections, setCollections] = useState<CollectionWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionEmoji, setNewCollectionEmoji] = useState('📁');
    const [collectionError, setCollectionError] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            // Use simple relative paths. 
            // If we are at /saved, api/recipes should hit /api/recipes relative to base
            const recipesRes = await fetch('api/recipes');
            const collectionsRes = await fetch('api/collections');

            if (!recipesRes.ok) throw new Error(`Recipes Fetch Failed: ${recipesRes.status} ${recipesRes.statusText}`);
            if (!collectionsRes.ok) throw new Error(`Collections Fetch Failed: ${collectionsRes.status} ${collectionsRes.statusText}`);

            const recipesData = await recipesRes.json();
            const collectionsData = await collectionsRes.json();

            setRecipes(recipesData.map((r: any) => ({ ...r, collectionIds: r.collectionIds || [] })));
            setCollections(collectionsData);
            setLoading(false);
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError(err.message || 'Unknown error');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredRecipes = useMemo(() => {
        let filtered = recipes;

        if (selectedCollectionId) {
            filtered = filtered.filter(r => r.collectionIds.includes(selectedCollectionId));
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(query) ||
                (r.summary && r.summary.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [recipes, selectedCollectionId, searchQuery]);

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;
        setCollectionError(null);

        try {
            const res = await fetch('api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCollectionName, emoji: newCollectionEmoji }),
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                if (res.ok) {
                    const newCollection = await res.json();
                    setCollections(prev => [{ ...newCollection, recipeCount: 0 }, ...prev]);
                    setNewCollectionName('');
                    setNewCollectionEmoji('📁');
                    setIsCreatingCollection(false);
                } else {
                    const data = await res.json();
                    setCollectionError(data.error || `Server error: ${res.status}`);
                }
            } else {
                const text = await res.text();
                console.error("Non-JSON response:", text.slice(0, 100)); // Log for debugging if possible
                setCollectionError(`API returned non-JSON (${res.status}). Path issue?`);
            }
        } catch (err: any) {
            console.error('Failed to create collection:', err);
            setCollectionError(`Network error: ${err.message}`);
        }
    };

    const handleDeleteCollection = async (id: string) => {
        if (!confirm('Are you sure you want to delete this collection? Recipes will not be deleted.')) return;
        try {
            await fetch(`api/collections/${id}`, { method: 'DELETE' });
            setCollections(prev => prev.filter(c => c.id !== id));
            if (selectedCollectionId === id) setSelectedCollectionId(null);
        } catch (err) {
            console.error('Failed to delete collection:', err);
        }
    };

    const handleDeleteRecipe = async (id: string) => {
        if (!confirm('Delete this recipe?')) return;
        try {
            await fetch(`api/recipes/${id}`, { method: 'DELETE' });
            setRecipes(recipes.filter(r => r.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const toggleRecipeInCollection = async (recipeId: string, collectionId: string, isInCollection: boolean) => {
        try {
            if (isInCollection) {
                await fetch(`api/collections/${collectionId}/recipes?recipeId=${recipeId}`, { method: 'DELETE' });
                setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, collectionIds: r.collectionIds.filter(id => id !== collectionId) } : r));
                setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, recipeCount: Math.max(0, c.recipeCount! - 1) } : c));
            } else {
                await fetch(`api/collections/${collectionId}/recipes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId })
                });
                setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, collectionIds: [...r.collectionIds, collectionId] } : r));
                setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, recipeCount: c.recipeCount! + 1 } : c));
            }
        } catch (error) {
            console.error('Failed to update collection', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex justify-center py-12">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header matches Main App logic from SavedPageClient but we add the wrapper div structure if needed */}
            {/* Main App SavedPageClient returns a div with space-y-8. We should wrap it in a container like Layout */}

            {/* Header Section from Addon (kept for nav) but styled like Main App */}
            <header className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 z-10 transition-colors">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="./" className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-xl font-bold font-heading">My Cookbook</h1>
                        </div>
                        {/* Mobile Header Action */}
                        <div className="md:hidden">
                            <Button onClick={() => window.location.href = './'} variant="default" size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                <span className="sr-only">Add</span>
                            </Button>
                        </div>
                    </div>

                    {/* Controls - Copied structure from SavedPageClient */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        {/* Search */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search recipes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
                            />
                        </div>

                        {/* Create Collection */}
                        {isCreatingCollection ? (
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <form onSubmit={handleCreateCollection} className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-4 items-center">
                                    <EmojiPicker value={newCollectionEmoji} onChange={setNewCollectionEmoji} />
                                    <Input
                                        placeholder="Collection name..."
                                        value={newCollectionName}
                                        onChange={(e) => { setNewCollectionName(e.target.value); setCollectionError(null); }}
                                        className={cn("w-full md:w-64", collectionError && "border-red-500 focus-visible:ring-red-500")}
                                        autoFocus
                                    />
                                    <Button type="submit" size="sm">Create</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setIsCreatingCollection(false); setNewCollectionEmoji('📁'); setCollectionError(null); }}>Cancel</Button>
                                </form>
                                {collectionError && (
                                    <p className="text-xs text-red-500 ml-11 animate-in fade-in slide-in-from-top-1">{collectionError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {/* Add Recipe Button for Desktop */}
                                <Link href="./" className="hidden md:block">
                                    <Button className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Recipe
                                    </Button>
                                </Link>
                                <Button onClick={() => setIsCreatingCollection(true)} variant="outline" className="gap-2 shrink-0">
                                    <Plus className="w-4 h-4" />
                                    New Collection
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Collections Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button
                            variant={selectedCollectionId === null ? "default" : "outline"}
                            onClick={() => setSelectedCollectionId(null)}
                            className="rounded-full gap-2 shrink-0"
                        >
                            <Folder className="w-4 h-4" />
                            All Recipes
                            <span className="ml-1 opacity-60 text-xs">{recipes.length}</span>
                        </Button>
                        {collections.map(collection => (
                            <div key={collection.id} className="relative group shrink-0">
                                <Button
                                    variant={selectedCollectionId === collection.id ? "default" : "outline"}
                                    onClick={() => setSelectedCollectionId(collection.id)}
                                    className={cn(
                                        "rounded-full gap-2 pr-9",
                                        selectedCollectionId === collection.id ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : ""
                                    )}
                                >
                                    <span>{collection.emoji}</span>
                                    {collection.name}
                                    <span className="ml-1 opacity-60 text-xs">{collection.recipeCount}</span>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                            <MoreVertical className="w-3 h-3" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteCollection(collection.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Collection
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Recipe Grid */}
                {filteredRecipes.length === 0 ? (
                    <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-primary/20 bg-muted/30">
                        {error ? (
                            <div className="text-red-500 mb-4">
                                <p className="font-bold">Error Loading Data:</p>
                                <p>{error}</p>
                                <Button variant="outline" onClick={fetchData} className="mt-4">Retry</Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-muted-foreground text-lg">No recipes found matching your filters.</p>
                                {selectedCollectionId ? (
                                    <Button variant="link" onClick={() => setSelectedCollectionId(null)} className="mt-2">
                                        View all recipes
                                    </Button>
                                ) : (
                                    <Link href="./" className="mt-4 inline-block">
                                        <Button className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Add Your First Recipe
                                        </Button>
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecipes.map((recipe) => (
                            <div key={recipe.id} className="group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-primary/20 relative flex flex-col h-full">
                                <Link href={`recipe/${recipe.id}`} className="absolute inset-0 z-10">
                                    <span className="sr-only">View {recipe.title}</span>
                                </Link>

                                <div className="h-48 overflow-hidden relative bg-muted">
                                    {recipe.image ? (
                                        <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                                            <ChefHat className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                    {/* Quick actions */}
                                    <div className="absolute top-2 right-2 z-20 flex gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 backdrop-blur shadow-sm hover:bg-white">
                                                    <MoreVertical className="w-4 h-4 text-gray-700" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Add to Collection</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {collections.map(collection => {
                                                    const isInCollection = recipe.collectionIds.includes(collection.id);
                                                    return (
                                                        <DropdownMenuCheckboxItem
                                                            key={collection.id}
                                                            checked={isInCollection}
                                                            onCheckedChange={() => toggleRecipeInCollection(recipe.id, collection.id, isInCollection)}
                                                        >
                                                            <span className="mr-2">{collection.emoji}</span>
                                                            {collection.name}
                                                        </DropdownMenuCheckboxItem>
                                                    );
                                                })}
                                                {collections.length === 0 && (
                                                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                                                        No collections yet
                                                    </div>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteRecipe(recipe.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Recipe
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-heading font-bold text-lg mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                        {recipe.title}
                                    </h3>

                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {recipe.collectionIds.map(id => {
                                            const col = collections.find(c => c.id === id);
                                            if (!col) return null;
                                            return (
                                                <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                    {col.emoji} {col.name}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center text-xs font-medium text-muted-foreground gap-3 mt-auto">
                                        {recipe.prepTime && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{recipe.prepTime}</span>
                                            </div>
                                        )}
                                        {recipe.servings && (
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{recipe.servings}</span>
                                            </div>
                                        )}
                                        {!recipe.prepTime && !recipe.servings && <span>View Recipe</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
