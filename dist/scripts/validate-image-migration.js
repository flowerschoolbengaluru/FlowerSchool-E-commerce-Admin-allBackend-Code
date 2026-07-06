#!/usr/bin/env tsx
/**
 * Validation script: Verify Base64 to File migration
 * Run: npx tsx scripts/validate-image-migration.ts
 */
import { db } from "../db.js";
import * as imageService from "../services/image-service.js";
const IMAGE_PATH_FIELDS = [
    "image_path",
    "image_first_path",
    "image_second_path",
    "image_third_path",
    "image_fourth_path",
    "image_fifth_path",
];
const BASE64_FIELDS = [
    "image",
    "imagefirst",
    "imagesecond",
    "imagethirder",
    "imagefoure",
    "imagefive",
];
async function validateMigration() {
    console.log("🔍 Validating image migration...\n");
    try {
        const { rows: allProducts } = await db.query(`SELECT id, name, image, imagefirst, imagesecond, imagethirder, imagefoure, imagefive,
              image_path, image_first_path, image_second_path, image_third_path, image_fourth_path, image_fifth_path
       FROM bouquetbar.products`);
        let productsWithPaths = 0;
        let productsWithBase64 = 0;
        let orphanedBase64 = 0;
        let totalImagesOnDisk = 0;
        let missingImages = 0;
        console.log(`📊 Checking ${allProducts.length} products...\n`);
        for (const product of allProducts) {
            const hasPath = IMAGE_PATH_FIELDS.some((field) => product[field]);
            const hasBase64 = BASE64_FIELDS.some((field) => product[field] && product[field] !== "placeholder" && product[field].length > 100);
            if (hasPath) {
                productsWithPaths++;
                // Check if files exist
                for (const field of IMAGE_PATH_FIELDS) {
                    const path = product[field];
                    if (path) {
                        const exists = await imageService.fileExists(path);
                        if (exists) {
                            totalImagesOnDisk++;
                        }
                        else {
                            missingImages++;
                            console.warn(`⚠️  Missing file: ${path}`);
                        }
                    }
                }
            }
            if (hasBase64) {
                productsWithBase64++;
                if (hasPath) {
                    orphanedBase64++;
                }
            }
        }
        console.log("📈 Validation Results:");
        console.log(`   • Products with file paths: ${productsWithPaths}/${allProducts.length}`);
        console.log(`   • Products with Base64 (orphaned): ${orphanedBase64}`);
        console.log(`   • Products still with only Base64: ${productsWithBase64 - orphanedBase64}`);
        console.log(`   • Total images on disk: ${totalImagesOnDisk}`);
        console.log(`   • Missing image files: ${missingImages}`);
        console.log("\n✅ Validation Summary:");
        if (missingImages === 0 && productsWithPaths > 0) {
            console.log("   🎉 All images successfully migrated!");
        }
        else if (missingImages > 0) {
            console.log(`   ⚠️  ${missingImages} image files are referenced but missing from disk`);
        }
        else if (productsWithBase64 > 0) {
            console.log(`   ⚠️  ${productsWithBase64} products still have Base64 images (not migrated yet)`);
        }
        if (orphanedBase64 > 0) {
            console.log(`   💾 ${orphanedBase64} products have both paths and Base64 (cleanup recommended)`);
        }
        console.log("\n");
        // Database size estimation
        console.log("💾 Database Impact:");
        let base64DataSize = 0;
        for (const product of allProducts) {
            for (const field of BASE64_FIELDS) {
                const data = product[field];
                if (data && typeof data === "string") {
                    base64DataSize += data.length;
                }
            }
        }
        const pathDataSize = allProducts.length * IMAGE_PATH_FIELDS.length * 50; // Estimated
        const reduction = base64DataSize - pathDataSize;
        console.log(`   • Current Base64 size: ${(base64DataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   • Path-only size: ${(pathDataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   • Potential reduction: ${(reduction / 1024 / 1024).toFixed(2)} MB`);
    }
    catch (error) {
        console.error("❌ Validation error:", error);
        process.exitCode = 1;
    }
    finally {
        await db.end();
    }
}
// Run validation
validateMigration();
