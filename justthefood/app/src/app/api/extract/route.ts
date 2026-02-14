import { NextRequest, NextResponse } from 'next/server';
import { extractRecipe } from '@/lib/recipe-extractor';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        const result = await extractRecipe(url);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Extract error:', error);
        return NextResponse.json(
            { error: 'Failed to extract recipe' },
            { status: 500 }
        );
    }
}
