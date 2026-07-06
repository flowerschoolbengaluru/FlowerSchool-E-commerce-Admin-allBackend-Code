import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
// Directory where images are stored on disk
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "products");
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
// Initialize upload directory
export async function initializeUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log("✓ Upload directory ready:", UPLOAD_DIR);
    }
    catch (error) {
        console.error("✗ Failed to create upload directory:", error);
        throw error;
    }
}
// Convert Base64 to file and return path
export async function saveBase64Image(base64String, fileName) {
    try {
        if (!base64String)
            return "";
        // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
        let buffer;
        try {
            const matches = base64String.match(/^data:image\/(\w+);base64,(.*)$/);
            if (matches) {
                buffer = Buffer.from(matches[2], "base64");
            }
            else {
                buffer = Buffer.from(base64String, "base64");
            }
        }
        catch (error) {
            console.error("Failed to decode base64:", error);
            return "";
        }
        // Validate file size
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
        // Generate unique filename
        const uniqueName = fileName || `img_${randomBytes(8).toString("hex")}.jpg`;
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        // Write file to disk
        await fs.writeFile(filePath, buffer);
        console.log("✓ Image saved:", uniqueName);
        // Return relative path for database
        return `products/${uniqueName}`;
    }
    catch (error) {
        console.error("✗ Error saving base64 image:", error);
        return "";
    }
}
// Save file from buffer (for multer)
export async function saveFileFromBuffer(buffer, originalFileName) {
    try {
        console.log(`\n[IMAGE-SERVICE] Saving file from buffer: ${originalFileName}`);
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
        // Generate unique filename preserving extension
        const ext = path.extname(originalFileName);
        const uniqueName = `${randomBytes(8).toString("hex")}${ext}`;
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        console.log(`[IMAGE-SERVICE] Writing to: ${filePath}`);
        // Write file to disk
        await fs.writeFile(filePath, buffer);
        console.log(`[IMAGE-SERVICE] ✓ File written successfully (${buffer.length} bytes)`);
        const relativePath = `products/${uniqueName}`;
        console.log(`[IMAGE-SERVICE] Relative path: ${relativePath}\n`);
        return relativePath;
    }
    catch (error) {
        console.error("[IMAGE-SERVICE] ✗ Error saving file from buffer:", error);
        return "";
    }
}
// Get full file path for serving
export function getFullFilePath(imagePath) {
    if (!imagePath)
        return "";
    // If it's already a full path, return as-is
    if (path.isAbsolute(imagePath)) {
        return imagePath;
    }
    // Otherwise, construct full path
    return path.join(process.cwd(), "public", imagePath);
}
// Check if file exists
export async function fileExists(imagePath) {
    try {
        if (!imagePath)
            return false;
        const fullPath = getFullFilePath(imagePath);
        await fs.access(fullPath);
        return true;
    }
    catch {
        return false;
    }
}
// Delete file from disk
export async function deleteFile(imagePath) {
    try {
        if (!imagePath)
            return false;
        const fullPath = getFullFilePath(imagePath);
        await fs.unlink(fullPath);
        console.log("✓ File deleted:", imagePath);
        return true;
    }
    catch (error) {
        console.error("✗ Error deleting file:", imagePath, error);
        return false;
    }
}
// Batch delete files
export async function deleteFiles(imagePaths) {
    for (const imagePath of imagePaths) {
        if (imagePath) {
            await deleteFile(imagePath);
        }
    }
}
// Get file size
export async function getFileSize(imagePath) {
    try {
        if (!imagePath)
            return 0;
        const fullPath = getFullFilePath(imagePath);
        const stats = await fs.stat(fullPath);
        return stats.size;
    }
    catch {
        return 0;
    }
}
// Validate MIME type (basic check)
export function validateMimeType(mimeType) {
    return ALLOWED_MIME_TYPES.includes(mimeType);
}
// Get mime type from file extension
export function getMimeTypeFromExtension(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    };
    return mimeTypes[ext] || "application/octet-stream";
}
// Migrate Base64 to files (for existing data)
export async function migrateBase64ToFile(base64String, productId, imageIndex) {
    try {
        if (!base64String)
            return "";
        const fileName = `prod_${productId}_img${imageIndex}.jpg`;
        return await saveBase64Image(base64String, fileName);
    }
    catch (error) {
        console.error(`✗ Migration failed for product ${productId} image ${imageIndex}:`, error);
        return "";
    }
}
// Get all images for a product
export async function getProductImages(productId) {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const productImages = files.filter((file) => file.includes(`prod_${productId}`));
        const images = {};
        for (const file of productImages) {
            const size = await getFileSize(`uploads/products/${file}`);
            images[file] = `${size} bytes`;
        }
        return images;
    }
    catch {
        return {};
    }
}
// Clean up orphaned images (called periodically)
export async function cleanupOrphanedImages(validImagePaths) {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        let deletedCount = 0;
        for (const file of files) {
            const fullPath = `uploads/products/${file}`;
            if (!validImagePaths.has(fullPath)) {
                await deleteFile(fullPath);
                deletedCount++;
            }
        }
        console.log(`✓ Cleaned up ${deletedCount} orphaned images`);
    }
    catch (error) {
        console.error("✗ Error cleaning up orphaned images:", error);
    }
}
// Export constants
export { UPLOAD_DIR, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
