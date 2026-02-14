
import { type NextRequest, NextResponse } from 'next/server';
import { deleteCollection } from '@/lib/db';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        deleteCollection(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
    }
}
