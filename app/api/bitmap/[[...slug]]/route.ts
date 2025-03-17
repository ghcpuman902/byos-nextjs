export const revalidate = 60;


import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createElement, cache } from "react";
import { renderBmp, DISPLAY_BMP_IMAGE_SIZE } from "@/utils/render-bmp";
import NotFoundScreen from "@/app/recipes/screens/not-found/not-found";
import screens from "@/app/recipes/screens.json";

// Define types for our cache
interface CacheItem {
	data: Buffer;
	expiresAt: number;
}

// Extend NodeJS namespace for global variables
declare global {
	// eslint-disable-next-line no-var
	var bitmapCache: Map<string, CacheItem> | undefined;
}

// Use the global bitmap cache only in development
const getBitmapCache = (): Map<string, CacheItem> | null => {
	// In production, return null to use Next.js built-in caching
	if (process.env.NODE_ENV === 'production') {
		return null;
	}
	
	// In development, use our global cache
	if (!global.bitmapCache) {
		global.bitmapCache = new Map<string, CacheItem>();
	}
	return global.bitmapCache;
};

// Update the loadFont cache function
const loadFont = cache(() => {
	try {
		return {
			blockKie: fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
			geneva9: fs.readFileSync(path.resolve("./public/fonts/geneva-9.ttf"))
		};
	} catch (error) {
		console.error("Error loading fonts:", error);
		return null;
	}
});

// Cache the fonts at module initialization
const fonts = loadFont();

// Get image options based on recipe configuration
const getImageOptions = (recipeId: string) => {
	// Check if the recipe exists and has doubleSizeForSharperText setting
	const config = screens[recipeId as keyof typeof screens];
	
	// Perform thorough type checking for nested properties
	let useDoubling = false;
	if (config && 
		'renderSettings' in config && 
		config.renderSettings && 
		typeof config.renderSettings === 'object' &&
		'doubleSizeForSharperText' in config.renderSettings) {
		useDoubling = Boolean(config.renderSettings.doubleSizeForSharperText);
	}
	
	const scaleFactor = useDoubling ? 2 : 1;
	
	console.log(`Rendering ${recipeId} with scale factor: ${scaleFactor}`);
	
	return {
		width: 800 * scaleFactor,
		height: 480 * scaleFactor,
		fonts: [
			...(fonts?.blockKie
				? [
						{
							name: "BlockKie",
							data: fonts.blockKie,
							weight: 400 as const,
							style: "normal" as const,
						},
					]
				: []),
			...(fonts?.geneva9
				? [
						{
							name: "Geneva9",
							data: fonts.geneva9,
							weight: 400 as const,
							style: "normal" as const,
						},
					]
				: []),
		],
		debug: false,
	};
};

// Helper function to load a recipe component - now using React's cache
const loadRecipeBuffer = cache(async (recipeId: string) => {
	try {
		// Check if the recipe exists in our components registry
		let element: React.ReactNode;
		if (screens[recipeId as keyof typeof screens]) {
			const { default: Component } = await import(
				`@/app/recipes/screens/${recipeId}/${recipeId}.tsx`
			);
			console.log(`Recipe component loaded: ${recipeId}`);
			let props = screens[recipeId as keyof typeof screens].props || {};
			
			// Handle data fetching recipes
			if (screens[recipeId as keyof typeof screens].hasDataFetch) {
				try {
					const { default: fetchDataFunction } = await import(
						`@/app/recipes/screens/${recipeId}/getData.ts`
					);
					
					// Set a timeout for data fetching to prevent hanging
					const fetchPromise = fetchDataFunction();
					const timeoutPromise = new Promise((_, reject) => {
						setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
					});
					
					// Race between the fetch and the timeout
					const fetchedData = await Promise.race([fetchPromise, timeoutPromise])
						.catch(error => {
							console.warn(`Data fetch error for ${recipeId}:`, error);
							return null;
						});
					
					// Check if the fetched data is valid
					if (fetchedData && typeof fetchedData === 'object') {
						props = fetchedData;
					} else {
						console.warn(`Invalid or missing data for ${recipeId}`);
					}
				} catch (error) {
					console.warn(`Error in data fetching for ${recipeId}:`, error);
					// Continue with default props
				}
			}
			element = createElement(Component, { ...props });
		} else {
			// If recipe component not found, use the NotFoundScreen
			element = createElement(NotFoundScreen, { slug: recipeId });
		}

		// Use recipe-specific image options
		const pngResponse = await new ImageResponse(element, getImageOptions(recipeId));
		return await renderBmp(pngResponse);
	} catch (error) {
		console.error(`Error loading recipe component ${recipeId}:`, error);
		return null;
	}
});

export async function generateStaticParams() {
	return [
		...Object.keys(screens).map((screen) => ({
			slug: [`${screen}.bmp`],
		})),
		...Object.keys(screens).map((screen) => ({
			slug: [screen],
		})),
	];
}

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["not-found"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const cacheKey = `api/bitmap/${bitmapPath}`;

		console.log(`Bitmap request for: ${bitmapPath}`);
		
		// Get the bitmap cache (will be null in production)
		const bitmapCache = getBitmapCache();
		
		// Only check cache in development
		if (bitmapCache?.has(cacheKey)) {
			const item = bitmapCache.get(cacheKey);
			// Since we've checked with .has(), item should exist, but let's be safe
			if (!item) {
				console.log(`⚠️ Cache inconsistency for ${cacheKey}`);
				return await generateBitmap(bitmapPath, cacheKey);
			}

			const now = Date.now();

			// Check if the item is still valid
			if (item.expiresAt > now) {
				console.log(`🔵 Global cache HIT for ${cacheKey}`);
				return new Response(item.data, {
					headers: {
						"Content-Type": "image/bmp",
						"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
					},
				});
			}

			console.log(`🟡 Global cache STALE for ${cacheKey}`);
			// Return stale data but trigger background revalidation
			const staleResponse = new Response(item.data, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
				},
			});

			// Revalidate in background with a fresh AbortController
			setTimeout(() => {
				console.log(`🔄 Background revalidation for ${cacheKey}`);
				generateBitmap(bitmapPath, cacheKey);
			}, 0);

			return staleResponse;
		}

		// Cache miss or in production - generate the bitmap
		return await generateBitmap(bitmapPath, cacheKey);
	} catch (error) {
		console.error("Error generating image:", error);

		// Instead of returning an error, return the NotFoundScreen as a fallback
		try {
			// Only load fonts when needed for error fallback
			const element = createElement(NotFoundScreen, { slug: "Error occurred" });
			// Use default options for error screen
			const defaultOptions = {
				width: 800,
				height: 480,
				fonts: [
					...(fonts?.blockKie
						? [
								{
									name: "BlockKie",
									data: fonts.blockKie,
									weight: 400 as const,
									style: "normal" as const,
								},
							]
						: []),
					...(fonts?.geneva9
						? [
								{
									name: "Geneva9",
									data: fonts.geneva9,
									weight: 400 as const,
									style: "normal" as const,
								},
							]
						: []),
				],
				debug: false,
			};
			const pngResponse = await new ImageResponse(element, defaultOptions);
			const buffer = await renderBmp(pngResponse);

			return new Response(buffer, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
				},
			});
		} catch (fallbackError) {
			console.error("Error generating fallback image:", fallbackError);
			return new Response("Error generating image", {
				status: 500,
				headers: {
					"Content-Type": "text/plain",
				},
			});
		}
	}
}

// Helper function to generate and cache bitmap
// Now using React's cache for the recipe buffer generation
const generateBitmap = cache(async (bitmapPath: string, cacheKey: string) => {
	// Extract the recipe slug from the URL
	// Format: [recipe_slug].bmp
	const recipeSlug = bitmapPath.replace(".bmp", "");

	// Default to 'simple-text' if no recipe is specified
	let recipeId = "simple-text";

	// Check if the requested recipe exists in our screens registry
	if (screens[recipeSlug as keyof typeof screens]) {
		recipeId = recipeSlug;
		console.log(`Recipe found: ${recipeSlug}`);
	} else {
		console.log(`Recipe not found: ${recipeSlug}, using default`);
	}

	// Try to load the recipe component using our cached function
	const recipeBuffer = await loadRecipeBuffer(recipeId);

	if (recipeBuffer) {
		const revalidate = 60;
		const now = Date.now();
		const expiresAt = now + revalidate * 1000;

		// Only cache in development
		const bitmapCache = getBitmapCache();
		if (bitmapCache) {
			bitmapCache.set(cacheKey, {
				data: recipeBuffer,
				expiresAt,
			});
		}

		console.log(`✅ Successfully generated bitmap for: ${bitmapPath}`);

		return new Response(recipeBuffer, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
			},
		});
	}

	throw new Error("Failed to generate recipe buffer");
});
