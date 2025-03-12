import type { ImageResponse } from "next/og";
import { Jimp } from "jimp";

// The exact size expected by the firmware
export const DISPLAY_BMP_IMAGE_SIZE = 48062;

export async function renderBmp(pngResponse: ImageResponse) {
	const pngBuffer = await pngResponse.arrayBuffer();

	// Convert PNG to BMP using Jimp
	const image = await Jimp.read(Buffer.from(pngBuffer));
	const { data } = image.bitmap;

	// Bayer dithering matrix 8x8 for improved monochrome rendering
	// Values are normalized to 0-63 range for efficient threshold comparison
	const bayerPattern = [
		[0, 32, 8, 40, 2, 34, 10, 42],
		[48, 16, 56, 24, 50, 18, 58, 26],
		[12, 44, 4, 36, 14, 46, 6, 38],
		[60, 28, 52, 20, 62, 30, 54, 22],
		[3, 35, 11, 43, 1, 33, 9, 41],
		[51, 19, 59, 27, 49, 17, 57, 25],
		[15, 47, 7, 39, 13, 45, 5, 37],
		[63, 31, 55, 23, 61, 29, 53, 21],
	];
	
	// Fixed dimensions to match the device requirements
	const width = 800;
	const height = 480;

	// BMP file header (14 bytes) + Info header (40 bytes)
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const bitsPerPixel = 1; // 1-bit monochrome
	const rowSize = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
	const paletteSize = 8; // 2 colors * 4 bytes each
	const fileSize = DISPLAY_BMP_IMAGE_SIZE; // Exactly match the expected size

	// Create a buffer of exactly the required size
	const buffer = Buffer.alloc(fileSize);

	// BMP File Header - matching firmware expectations
	buffer.write("BM", 0); // Signature
	buffer.writeUInt32LE(fileSize, 2); // File Size
	buffer.writeUInt32LE(0, 6); // Reserved
	buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize + paletteSize, 10); // Pixel data offset

	// BMP Info Header - matching firmware expectations
	buffer.writeUInt32LE(infoHeaderSize, 14); // Info Header Size
	buffer.writeInt32LE(width, 18); // Width
	buffer.writeInt32LE(height, 22); // Height
	buffer.writeUInt16LE(1, 26); // Planes
	buffer.writeUInt16LE(bitsPerPixel, 28); // Bits per pixel (1-bit)
	buffer.writeUInt32LE(0, 30); // Compression
	buffer.writeUInt32LE(rowSize * height, 34); // Image Size
	buffer.writeInt32LE(0, 38); // X pixels per meter
	buffer.writeInt32LE(0, 42); // Y pixels per meter
	buffer.writeUInt32LE(2, 46); // Total Colors (2 for monochrome)
	buffer.writeUInt32LE(2, 50); // Important Colors

	// Color Palette (2 colors: black and white)
	const paletteOffset = fileHeaderSize + infoHeaderSize;
	buffer.writeUInt32LE(0x00ffffff, paletteOffset); // White
	buffer.writeUInt32LE(0x00000000, paletteOffset + 4); // Black

	// Pixel Data - Convert to 1-bit monochrome using Bayer dithering
	const dataOffset = fileHeaderSize + infoHeaderSize + paletteSize;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x += 8) {
			let byte = 0;
			for (let bit = 0; bit < 8 && x + bit < width; bit++) {
				const srcPos = ((height - 1 - y) * width + (x + bit)) * 4;
				// Calculate grayscale value
				const gray =
					data[srcPos] * 0.3 +
					data[srcPos + 1] * 0.59 +
					data[srcPos + 2] * 0.11;
				
				// First check if this is a pure black or white pixel
				if (gray < 100) {
					// Pure black pixel
					byte |= 1 << (7 - bit);
				} else if (gray === 255) {
					// Pure white pixel - do nothing (bit stays 0)
				} else {
					// For grayscale pixels, apply Bayer dithering
					const thresholdValue = bayerPattern[y % 8][(x + bit) % 8];
					const normalizedGray = Math.floor(gray * 64 / 255);
					
					if (normalizedGray <= thresholdValue) {
						byte |= 1 << (7 - bit);
					}
				}
			}
			const destPos = dataOffset + (y * rowSize + Math.floor(x / 8));
			buffer[destPos] = byte;
		}
	}

	// Ensure the buffer is exactly DISPLAY_BMP_IMAGE_SIZE bytes
	if (buffer.length !== DISPLAY_BMP_IMAGE_SIZE) {
		console.warn(
			`BMP size mismatch: ${buffer.length} vs expected ${DISPLAY_BMP_IMAGE_SIZE}`,
		);
	}

	return buffer;
}
