import { NextRequest, NextResponse } from 'next/server';
import { upsertRecipe, getAllRecipes, getCollectionsForRecipe } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log("[API] POST /api/recipes START");
    try {
        const body = await req.json();
        const { url, title, image, summary, prepTime, cookTime, servings, ingredients, instructions } = body;
        console.log("[API] Saving recipe:", title);

        if (!url || !title || !ingredients || !instructions) {
            console.warn("[API] Missing fields");
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const recipe = upsertRecipe({
            url,
            title,
            image,
            summary,
            prepTime,
            cookTime,
            servings,
            ingredients,
            instructions,
        });
        console.log("[API] Recipe saved, ID:", recipe.id);

        return NextResponse.json(recipe);
    } catch (error) {
        console.error('[API] Save recipe error:', error);
        return NextResponse.json(
            { error: 'Failed to save recipe' },
            { status: 500 }
        );
    }
}

export async function GET() {
    console.log("[API] GET /api/recipes START");
    try {
        const recipes = getAllRecipes();
        console.log(`[API] GET /api/recipes: Found ${recipes.length}`);
        const recipesWithCollections = recipes.map(recipe => ({
            ...recipe,
            collectionIds: getCollectionsForRecipe(recipe.id)
        }));
        return NextResponse.json(recipesWithCollections, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('[API] Get recipes error:', error);
        return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }
}
