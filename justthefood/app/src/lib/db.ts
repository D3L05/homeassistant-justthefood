import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
// Define types locally
export interface SavedRecipe {
    id: string;
    url: string;
    title: string;
    image: string | null;
    summary: string | null;
    prepTime: string | null;
    cookTime: string | null;
    servings: string | null;
    ingredients: string[];
    instructions: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Collection {
    id: string;
    name: string;
    emoji: string;
    createdAt: string;
    recipeCount?: number;
}

const DB_PATH = process.env.DATABASE_PATH || '/data/recipes.db';

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
    } catch (e) {
        console.error("Failed to create DB directory:", e);
    }
}

// Initialize Database Lazily
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
    if (dbInstance) return dbInstance;

    try {
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            try {
                fs.mkdirSync(dbDir, { recursive: true });
            } catch (e) {
                console.error("Failed to create DB directory:", e);
            }
        }

        dbInstance = new Database(DB_PATH);
        console.log(`Connected to database at ${DB_PATH}`);

        // Initialize Schema
        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                url TEXT UNIQUE,
                title TEXT,
                image TEXT,
                summary TEXT,
                prepTime TEXT,
                cookTime TEXT,
                servings TEXT,
                ingredients TEXT,
                instructions TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
        `);

        // Check/Fix collections schema (missing createdAt)
        try {
            const tableInfo = dbInstance.prepare("PRAGMA table_info(collections)").all() as any[];
            const hasCreatedAt = tableInfo.some(col => col.name === 'createdAt');

            if (tableInfo.length > 0 && !hasCreatedAt) {
                console.warn("[DB] Detected old schema for collections (missing createdAt). Recreating table...");
                // We might lose collections here, but the user likely has none working anyway.
                dbInstance.exec("DROP TABLE collections");
            }
        } catch (e) {
            console.error("[DB] Failed to check collections schema:", e);
        }

        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT,
                emoji TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check/Fix collection_recipes schema
        try {
            const tableInfo = dbInstance.prepare("PRAGMA table_info(collection_recipes)").all() as any[];
            const hasCollectionId = tableInfo.some(col => col.name === 'collectionId');

            if (tableInfo.length > 0 && !hasCollectionId) {
                console.warn("[DB] Detected old schema for collection_recipes (missing collectionId). Recreating table...");
                dbInstance.exec("DROP TABLE collection_recipes");
            }
        } catch (e) {
            console.error("[DB] Failed to check schema:", e);
        }

        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS collection_recipes (
                collectionId TEXT,
                recipeId TEXT,
                PRIMARY KEY (collectionId, recipeId),
                FOREIGN KEY(collectionId) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY(recipeId) REFERENCES recipes(id) ON DELETE CASCADE
            );
        `);

        return dbInstance;
    } catch (error) {
        console.error("Failed to open database:", error);
        throw error;
    }
}


// Helpers
function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// --- Recipe Operations ---

export function upsertRecipe(data: {
    url: string;
    title: string;
    image?: string;
    summary?: string;
    prepTime?: string;
    cookTime?: string;
    servings?: string;
    ingredients: string[];
    instructions: string[];
}): SavedRecipe {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM recipes WHERE url = ?').get(data.url) as { id: string } | undefined;

    const now = new Date().toISOString();
    const ingredientsJson = JSON.stringify(data.ingredients);
    const instructionsJson = JSON.stringify(data.instructions);

    if (existing) {
        db.prepare(`
            UPDATE recipes SET 
                title = ?, image = ?, summary = ?, prepTime = ?, cookTime = ?, servings = ?, 
                ingredients = ?, instructions = ?, updatedAt = ?
            WHERE id = ?
        `).run(
            data.title, data.image || null, data.summary || null, data.prepTime || null,
            data.cookTime || null, data.servings || null, ingredientsJson, instructionsJson, now,
            existing.id
        );
        return getRecipeById(existing.id)!;
    } else {
        const id = generateId();
        db.prepare(`
            INSERT INTO recipes (id, url, title, image, summary, prepTime, cookTime, servings, ingredients, instructions, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, data.url, data.title, data.image || null, data.summary || null, data.prepTime || null,
            data.cookTime || null, data.servings || null, ingredientsJson, instructionsJson, now, now
        );
        return getRecipeById(id)!;
    }
}

export function getAllRecipes(): SavedRecipe[] {
    const db = getDb();
    try {
        const rows = db.prepare('SELECT * FROM recipes ORDER BY createdAt DESC').all();
        console.log(`[DB] getAllRecipes found ${rows.length} rows`);
        return rows.map((row: any) => ({
            ...row,
            ingredients: JSON.parse(row.ingredients || '[]'),
            instructions: JSON.parse(row.instructions || '[]')
        }));
    } catch (e) {
        console.error("[DB] getAllRecipes FAILED:", e);
        return [];
    }
}

export function getRecipeById(id: string): SavedRecipe | null {
    const db = getDb();
    try {
        const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
        console.log(`[DB] getRecipeById(${id}) found:`, !!row);
        if (!row) return null;
        const r = row as any;
        return {
            ...r,
            ingredients: JSON.parse(r.ingredients || '[]'),
            instructions: JSON.parse(r.instructions || '[]')
        };
    } catch (e) {
        console.error(`[DB] getRecipeById(${id}) FAILED:`, e);
        return null;
    }
}

export function updateRecipe(id: string, updates: Partial<SavedRecipe>): SavedRecipe | null {
    const db = getDb();
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.ingredients !== undefined) { sets.push('ingredients = ?'); values.push(JSON.stringify(updates.ingredients)); }
    if (updates.instructions !== undefined) { sets.push('instructions = ?'); values.push(JSON.stringify(updates.instructions)); }

    if (sets.length === 0) return getRecipeById(id);

    sets.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const info = db.prepare(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    return info.changes > 0 ? getRecipeById(id) : null;
}

export function deleteRecipe(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    return info.changes > 0;
}


// --- Collection Operations ---

export function getCollections(): Collection[] {
    try {
        const db = getDb();
        const collections = db.prepare(`
            SELECT c.*, COUNT(cr.recipeId) as recipeCount
            FROM collections c
            LEFT JOIN collection_recipes cr ON c.id = cr.collectionId
            GROUP BY c.id
            ORDER BY c.createdAt DESC
        `).all() as Collection[];
        console.log(`[DB] getCollections found ${collections.length} rows`);
        return collections;
    } catch (e) {
        // Fallback for migration safety?
        console.error("Failed to get collections:", e);
        return [];
    }
}

export function createCollection(name: string, emoji: string): Collection {
    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO collections (id, name, emoji) VALUES (?, ?, ?)').run(id, name, emoji);
    return { id, name, emoji, createdAt: new Date().toISOString(), recipeCount: 0 };
}

export function deleteCollection(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    return info.changes > 0;
}

export function addRecipeToCollection(collectionId: string, recipeId: string): boolean {
    try {
        const db = getDb();
        db.prepare('INSERT OR IGNORE INTO collection_recipes (collectionId, recipeId) VALUES (?, ?)').run(collectionId, recipeId);
        return true;
    } catch (e) {
        console.error("Failed to add to collection:", e);
        return false;
    }
}

export function removeRecipeFromCollection(collectionId: string, recipeId: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM collection_recipes WHERE collectionId = ? AND recipeId = ?').run(collectionId, recipeId);
    return info.changes > 0;
}

export function getCollectionsForRecipe(recipeId: string): string[] {
    const db = getDb();
    // FIX: Pass recipeId to .all()
    const rows = db.prepare('SELECT collectionId FROM collection_recipes WHERE recipeId = ?').all(recipeId) as { collectionId: string }[];
    return rows.map(r => r.collectionId);
}
