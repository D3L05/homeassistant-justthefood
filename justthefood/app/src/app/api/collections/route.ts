import { type NextRequest, NextResponse } from 'next/server';
import { getCollections, createCollection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log("[API] GET /api/collections START");
    try {
        const collections = getCollections();
        console.log(`[API] GET /api/collections SUCCESS: Found ${collections.length}`);
        return NextResponse.json(collections, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error: any) {
        console.error("[API] GET /api/collections ERROR:", error);
        return NextResponse.json(
            { error: `Failed to fetch collections: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    console.log("[API] POST /api/collections START");
    try {
        const body = await request.json();
        const { name, emoji } = body;
        console.log("[API] Payload:", { name, emoji });

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const collection = createCollection(name, emoji);
        console.log("[API] Created:", collection);
        return NextResponse.json(collection);
    } catch (error: any) {
        console.error("[API] POST /api/collections ERROR:", error);
        return NextResponse.json(
            { error: `Failed to create collection: ${error.message}` },
            { status: 500 }
        );
    }
}
