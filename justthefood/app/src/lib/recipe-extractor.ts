import * as cheerio from 'cheerio';
import type { Recipe, ExtractionResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Decode HTML entities like &amp; &lt; &gt; &#39; &#x27; etc.
 */
function decodeHtmlEntities(text: string): string {
    if (!text) return text;

    // Named entities
    const namedEntities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
        '&ndash;': '\u2013',
        '&mdash;': '\u2014',
        '&lsquo;': '\u2018',
        '&rsquo;': '\u2019',
        '&ldquo;': '\u201C',
        '&rdquo;': '\u201D',
        '&deg;': '\u00B0',
        '&frac12;': '\u00BD',
        '&frac14;': '\u00BC',
        '&frac34;': '\u00BE',
    };

    // First replace named entities
    let result = text.replace(/&[a-zA-Z]+;/g, (match) => namedEntities[match] || match);

    // Then replace numeric entities (decimal): &#39; &#176; etc.
    result = result.replace(/&#(\d+);/g, (_, code) => {
        const num = parseInt(code, 10);
        return num > 0 ? String.fromCharCode(num) : _;
    });

    // Then replace numeric entities (hex): &#x27; &#xB0; etc.
    result = result.replace(/&#x([a-fA-F0-9]+);/g, (_, code) => {
        const num = parseInt(code, 16);
        return num > 0 ? String.fromCharCode(num) : _;
    });

    return result;
}

/**
 * Parse ISO 8601 duration to human-readable format
 * e.g., "PT30M" -> "30 mins", "PT1H30M" -> "1 hr 30 mins"
 */
function parseDuration(duration: string | undefined): string | undefined {
    if (!duration) return undefined;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);

    return parts.join(' ') || undefined;
}

/**
 * Parse instructions from various JSON-LD formats
 */
function parseInstructions(instructions: unknown): string[] {
    if (!instructions) return [];

    if (typeof instructions === 'string') {
        return instructions.split(/\n+/).filter(Boolean).map(s => decodeHtmlEntities(s.trim()));
    }

    if (Array.isArray(instructions)) {
        return instructions.flatMap((item): string[] => {
            // Simple string
            if (typeof item === 'string') {
                return [decodeHtmlEntities(item.trim())];
            }

            // HowToStep
            if (item['@type'] === 'HowToStep' && item.text) {
                return [decodeHtmlEntities(item.text.trim())];
            }

            // HowToSection with itemListElement
            if (item['@type'] === 'HowToSection' && item.itemListElement) {
                return parseInstructions(item.itemListElement);
            }

            // Fallback for objects with text property
            if (item.text) {
                return [decodeHtmlEntities(item.text.trim())];
            }

            return [];
        });
    }

    return [];
}

/**
 * Parse ingredients from JSON-LD
 */
function parseIngredients(ingredients: unknown): string[] {
    if (!ingredients) return [];

    if (typeof ingredients === 'string') {
        return ingredients.split(/\n+/).filter(Boolean).map(s => decodeHtmlEntities(s.trim()));
    }

    if (Array.isArray(ingredients)) {
        return ingredients.map(item => {
            if (typeof item === 'string') return decodeHtmlEntities(item.trim());
            if (item.text) return decodeHtmlEntities(item.text.trim());
            return decodeHtmlEntities(String(item));
        }).filter(Boolean);
    }

    return [];
}

/**
 * Get image URL from various JSON-LD image formats
 */
function parseImage(image: unknown): string | undefined {
    if (!image) return undefined;

    if (typeof image === 'string') return image;

    if (Array.isArray(image)) {
        const first = image[0];
        if (typeof first === 'string') return first;
        if (first?.url) return first.url;
    }

    if (typeof image === 'object' && image !== null) {
        const imgObj = image as Record<string, unknown>;
        if (imgObj.url) return String(imgObj.url);
    }

    return undefined;
}

/**
 * Strategy A: Extract recipe from JSON-LD structured data
 */
export async function extractWithJsonLd(html: string, sourceUrl: string): Promise<ExtractionResult> {
    try {
        const $ = cheerio.load(html);
        const jsonLdScripts = $('script[type="application/ld+json"]');

        let recipeData: Record<string, unknown> | null = null;

        jsonLdScripts.each((_, element) => {
            if (recipeData) return; // Already found

            try {
                const content = $(element).html();
                if (!content) return;

                const parsed = JSON.parse(content);

                // Handle valid JSON-LD formats: Array, Object with @graph, or single Object
                let candidates: any[] = [];
                if (Array.isArray(parsed)) {
                    candidates = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    if ('@graph' in parsed && Array.isArray(parsed['@graph'])) {
                        candidates = parsed['@graph'];
                    } else {
                        candidates = [parsed];
                    }
                }

                for (const candidate of candidates) {
                    const type = candidate['@type'];
                    // Type can be a string "Recipe" or an array ["Recipe", "Thing"]
                    const isRecipe = type === 'Recipe' ||
                        (Array.isArray(type) && type.includes('Recipe'));

                    if (isRecipe) {
                        recipeData = candidate;
                        return;
                    }
                }
            } catch {
                // Invalid JSON, skip
            }
        });

        if (!recipeData) {
            return {
                success: false,
                error: 'No JSON-LD recipe data found'
            };
        }

        // Type assertion after null check - TypeScript doesn't track assignments in .each()
        const data = recipeData as Record<string, unknown>;

        const recipe: Recipe = {
            title: decodeHtmlEntities(String(data.name || 'Untitled Recipe')),
            summary: data.description ? decodeHtmlEntities(String(data.description)) : undefined,
            image: parseImage(data.image),
            prepTime: parseDuration(data.prepTime as string),
            cookTime: parseDuration(data.cookTime as string),
            totalTime: parseDuration(data.totalTime as string),
            servings: data.recipeYield
                ? (Array.isArray(data.recipeYield)
                    ? String(data.recipeYield[0])
                    : String(data.recipeYield))
                : undefined,
            ingredients: parseIngredients(data.recipeIngredient),
            instructions: parseInstructions(data.recipeInstructions),
            source: sourceUrl
        };

        return {
            success: true,
            recipe,
            strategy: 'json-ld'
        };

    } catch (error) {
        return {
            success: false,
            error: `JSON-LD extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Strategy C: Heuristic Extraction (Scraping based on common patterns)
 */
function extractWithHeuristics(html: string, sourceUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const recipe: Recipe = {
        title: '',
        ingredients: [],
        instructions: [],
        source: sourceUrl
    };

    // 1. Extract Title: Try h1, then og:title, then title
    recipe.title = $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        'Untitled Recipe';

    // 2. Extract Image
    recipe.image = $('meta[property="og:image"]').attr('content');

    // 3. Extract Summary
    recipe.summary = $('meta[property="og:description"]').attr('content');

    // 4. Extract Ingredients and Instructions using Header/List pattern
    $('h2, h3, h4').each((_, header) => {
        const text = $(header).text().toLowerCase();

        // Check for Ingredients Header
        if (text.includes('ingredientes') || text.includes('ingredients')) {
            // Look for next list
            let nextEl = $(header).next();
            // Skip up to 5 non-list elements (figures, spacers, etc)
            for (let i = 0; i < 5; i++) {
                // Check if current element is list
                if (nextEl.is('ul') || nextEl.is('ol')) {
                    nextEl.find('li').each((_, li) => {
                        recipe.ingredients.push($(li).text().trim());
                    });
                    break;
                }
                // Check if current element CONTAINS list (e.g. div wrapper)
                const childList = nextEl.find('ul, ol').first();
                if (childList.length > 0) {
                    childList.find('li').each((_, li) => {
                        recipe.ingredients.push($(li).text().trim());
                    });
                    break;
                }

                nextEl = nextEl.next();
            }
        }

        // Check for Instructions Header
        if (text.includes('instrucciones') || text.includes('instructions') ||
            text.includes('preparación') || text.includes('preparation') ||
            text.includes('paso a paso') || text.includes('how to make') ||
            text.includes('cómo hacer') || text.includes('elaboración')) {

            let nextEl = $(header).next();
            let stepsFound = false;

            // Strategy 1: Look for list (ol/ul) or nested list
            let tempNext = nextEl;
            for (let i = 0; i < 5; i++) {
                let targetList = null;

                if (tempNext.is('ol') || tempNext.is('ul')) {
                    targetList = tempNext;
                } else {
                    const childList = tempNext.find('ol, ul').first();
                    if (childList.length > 0) targetList = childList;
                }

                if (targetList) {
                    targetList.find('li').each((_, li) => {
                        // Sometimes text is in <p> inside <li>
                        const pText = $(li).find('p').text().trim();
                        const liText = $(li).text().trim();
                        // Use pText if available and substantial, otherwise liText
                        recipe.instructions.push(pText.length > 5 ? pText : liText);
                    });
                    stepsFound = true;
                    break;
                }
                tempNext = tempNext.next();
            }

            // Strategy 2: Look for paragraphs (p) if no list found
            // Many blogs use <p>1. Step one...</p> <p>2. Step two...</p>
            if (!stepsFound) {
                let pNext = nextEl;
                let instructions: string[] = [];
                // Capture up to 20 paragraphs as long as they look like content
                for (let i = 0; i < 20; i++) {
                    const tagName = pNext.prop('tagName')?.toLowerCase();
                    if (tagName === 'h2' || tagName === 'h3') break; // Stop at next header

                    if (tagName === 'p') {
                        const content = pNext.text().trim();
                        // Filter out short garbage, ads, or links by length and keywords
                        const isValidContent = content.length > 10 &&
                            !content.toLowerCase().includes('suscrib') &&
                            !content.toLowerCase().includes('compartir') &&
                            !content.toLowerCase().includes('facebook') &&
                            !pNext.find('.adsbygoogle').length;

                        if (isValidContent) {
                            instructions.push(content);
                        }
                    }
                    pNext = pNext.next();
                }

                if (instructions.length > 0) {
                    recipe.instructions = instructions;
                }
            }
        }
    });

    // Validate if we found enough content
    if (recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
        return {
            success: true,
            recipe,
            strategy: 'heuristics'
        };
    }

    return {
        success: false,
        error: 'Heuristics failed to find ingredients or instructions'
    };
}

/**
 * Strategy B: Extract recipe using LLM (multi-provider)
 */
export async function extractWithLLM(text: string): Promise<ExtractionResult> {
    const { isAIEnabled, completeAI } = await import('./ai-client');

    if (!isAIEnabled()) {
        console.warn('AI is not enabled or configured. Returning mock data.');
        return {
            success: true,
            recipe: {
                title: 'Mock Recipe (AI Not Configured)',
                summary: 'Enable AI in the addon settings and add your API key to enable real AI extraction.',
                ingredients: [
                    '1 API Key (OpenAI, Gemini, or Claude)',
                    'Addon Configuration Panel'
                ],
                instructions: [
                    'Go to Home Assistant Settings > Add-ons > JustTheFood > Configuration.',
                    'Set ai_enabled to true.',
                    'Choose your preferred ai_provider (openai, gemini, or claude).',
                    'Add your ai_api_key.',
                    'Restart the addon.'
                ],
                prepTime: '2 mins',
                cookTime: '0 mins',
                servings: '1 developer'
            },
            strategy: 'llm'
        };
    }

    try {
        const result = await completeAI({
            systemPrompt: `You are a precise recipe extraction engine. Your sole purpose is to convert unstructured culinary text into strict JSON.
Rules:
1. IGNORE narrative content, ads, and life stories.
2. EXTRACT: title, summary, servings, times (prep/cook), ingredients (keep original string), instructions (array of strings).
3. RETURN JSON ONLY. No markdown formatting.`,
            userPrompt: text,
            maxTokens: 4000,
            temperature: 0.1,
            jsonMode: true,
        });

        if (!result.success || !result.content) {
            throw new Error(result.error || 'Empty response from LLM');
        }

        const data = JSON.parse(result.content);

        // Map dynamic JSON to our strict interface
        const recipe: Recipe = {
            title: data.title || 'Untitled Recipe',
            summary: data.summary,
            ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(String) : [],
            instructions: Array.isArray(data.instructions) ? data.instructions.map(String) : [],
            servings: data.servings ? String(data.servings) : undefined,
            prepTime: data.times?.prep || data.prepTime,
            cookTime: data.times?.cook || data.cookTime,
            totalTime: data.times?.total || data.totalTime,
        };

        return {
            success: true,
            recipe,
            strategy: 'llm'
        };

    } catch (error) {
        console.error('LLM Extraction Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'LLM extraction failed'
        };
    }
}

/**
 * Fetch URL content with proper headers
 */
async function fetchUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                // Use a standard browser User-Agent to avoid blocking (e.g., BonViveur blocks custom bots)
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    } catch (fetchError) {
        // Fallback to system curl if fetch fails (e.g., AggregateError, TLS issues, or 403 blocks)
        console.warn(`Node fetch failed for ${url}, attempting curl fallback... Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);

        try {
            // curl -s (silent) -L (follow redirects)
            const { stdout } = await execAsync(`curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
            return stdout;
        } catch (curlError) {
            // Throw original error with cause if curl also fails
            throw new Error(`Failed to fetch URL via fetch or curl`, { cause: fetchError });
        }
    }
}

/**
 * Extract plain text from HTML for LLM fallback
 */
function extractPlainText(html: string): string {
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, header, aside elements
    $('script, style, nav, footer, header, aside, .advertisement, .ad, [class*="social"]').remove();

    // Get the main content area or body
    const main = $('main, article, [role="main"], .recipe, .post-content, .entry-content').first();
    const content = main.length ? main : $('body');

    return content.text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000); // Limit for LLM context
}

/**
 * Main extraction function - tries JSON-LD first, falls back to LLM
 */
export async function extractRecipe(url: string): Promise<ExtractionResult> {
    try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return {
                success: false,
                error: 'Invalid URL protocol. Only HTTP and HTTPS are supported.'
            };
        }

        // Fetch the page
        const html = await fetchUrl(url);

        // Try Strategy A: JSON-LD
        const jsonLdResult = await extractWithJsonLd(html, url);
        if (jsonLdResult.success && jsonLdResult.recipe) {
            // Validate quality of JSON-LD
            const hasInstructions = jsonLdResult.recipe.instructions && jsonLdResult.recipe.instructions.length > 0;
            const hasIngredients = jsonLdResult.recipe.ingredients && jsonLdResult.recipe.ingredients.length > 0;

            // Only use JSON-LD if we have both ingredients and instructions
            if (hasInstructions && hasIngredients) {
                return jsonLdResult;
            }
            console.log('JSON-LD found but missing content, falling back to LLM');
        }

        // Strategy B: Heuristics (Smart Scraping)
        console.log('Attempting Heuristic Extraction...');
        const heuristicResult = extractWithHeuristics(html, url);
        if (heuristicResult.success) {
            return heuristicResult;
        }

        // Strategy C: LLM Fallback (Strategy B in legacy comments)
        console.log('Heuristics failed, falling back to LLM...');
        const plainText = extractPlainText(html);
        return await extractWithLLM(plainText);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorCause = error instanceof Error && (error as any).cause ? ` [Cause: ${String((error as any).cause)}]` : '';
        return {
            success: false,
            error: errorMessage + errorCause
        };
    }
}
