#!/usr/bin/env tsx
/**
 * Migration script: Convert Base64 images in database to files on disk
 * Run: npx tsx scripts/migrate-base64-to-files.ts
 */

import { db } from "../db.js";
import * as imageService from "../services/image-service.js";

// Maps the legacy Base64 column to its path column (see shared/schema.ts)
const IMAGE_FIELDS_MAP = [
  { base64Field: "image", pathField: "image_path", index: 0 },
  { base64Field: "imagefirst", pathField: "image_first_path", index: 1 },
  { base64Field: "imagesecond", pathField: "image_second_path", index: 2 },
  { base64Field: "imagethirder", pathField: "image_third_path", index: 3 },
  { base64Field: "imagefoure", pathField: "image_fourth_path", index: 4 },
  { base64Field: "imagefive", pathField: "image_fifth_path", index: 5 },
];

async function migrateImages() {
  console.log("🚀 Starting Base64 to File migration...\n");

  try {
    // Initialize upload directory
    await imageService.initializeUploadDir();

    // Get all products with Base64 images
    const { rows: allProducts } = await db.query(
      `SELECT id, name, image, imagefirst, imagesecond, imagethirder, imagefoure, imagefive,
              image_path, image_first_path, image_second_path, image_third_path, image_fourth_path, image_fifth_path
       FROM bouquetbar.products`
    );
    console.log(`📊 Found ${allProducts.length} products`);

    let migratedCount = 0;
    let failedCount = 0;

    // Process each product
    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      const progress = `[${i + 1}/${allProducts.length}]`;
      const updates: Record<string, string> = {};

      // Check each image field
      for (const fieldMap of IMAGE_FIELDS_MAP) {
        const base64String = product[fieldMap.base64Field];

        // Skip if already migrated (has path)
        if (product[fieldMap.pathField]) {
          continue;
        }

        // Skip if no Base64 data
        if (!base64String) {
          continue;
        }

        // Skip placeholder images
        if (base64String === "placeholder" || base64String.length < 100) {
          continue;
        }

        try {
          // Save Base64 to file
          const filePath = await imageService.saveBase64Image(
            base64String,
            `prod_${product.id}_img${fieldMap.index}.jpg`
          );

          if (filePath) {
            updates[fieldMap.pathField] = filePath;
            console.log(
              `  ✓ ${progress} ${product.name} - Image ${fieldMap.index}: Migrated`
            );
          }
        } catch (error) {
          failedCount++;
          console.error(
            `  ✗ ${progress} ${product.name} - Image ${fieldMap.index}: Failed`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Update product with new paths
      const updateKeys = Object.keys(updates);
      if (updateKeys.length > 0) {
        try {
          const setClause = updateKeys
            .map((key, idx) => `${key} = $${idx + 1}`)
            .join(", ");
          const values = updateKeys.map((key) => updates[key]);

          await db.query(
            `UPDATE bouquetbar.products SET ${setClause} WHERE id = $${updateKeys.length + 1}`,
            [...values, product.id]
          );

          migratedCount += updateKeys.length;
          console.log(`  ✓ ${progress} ${product.name}: Database updated\n`);
        } catch (error) {
          console.error(
            `  ✗ Failed to update product ${product.id}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    console.log("\n✅ Migration Summary:");
    console.log(`   • Total products: ${allProducts.length}`);
    console.log(`   • Images migrated: ${migratedCount}`);
    console.log(`   • Migration failed: ${failedCount}`);
    console.log("\n📁 Images saved to: public/products/\n");

    console.log("🎉 Migration complete!");
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

// Run migration
migrateImages();
