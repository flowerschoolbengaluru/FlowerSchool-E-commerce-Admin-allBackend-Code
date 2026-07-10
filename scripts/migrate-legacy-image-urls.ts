#!/usr/bin/env tsx
/**
 * One-time migration: replace raw Base64 strings still sitting in the legacy
 * image columns (image, imagefirst, imagesecond, imagethirder, imagefoure,
 * imagefive) with the URL built from their sibling *_path column, which is
 * already populated (image_path, image_first_path, ...).
 *
 * Does NOT touch the *_path columns. Does NOT touch any other column.
 * Skips a field when its base64 value has no corresponding *_path to migrate to.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-image-urls.ts            (dry run, no writes)
 *   npx tsx scripts/migrate-legacy-image-urls.ts --execute   (applies + commits)
 */

import { db } from "../db.js";

const DOMAIN = "http://flowerschoolbengaluru.com";
const EXECUTE = process.argv.includes("--execute");

const FIELD_MAP = [
  { base64Field: "image", pathField: "image_path" },
  { base64Field: "imagefirst", pathField: "image_first_path" },
  { base64Field: "imagesecond", pathField: "image_second_path" },
  { base64Field: "imagethirder", pathField: "image_third_path" },
  { base64Field: "imagefoure", pathField: "image_fourth_path" },
  { base64Field: "imagefive", pathField: "image_fifth_path" },
] as const;

function looksLikeBase64(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("/9j/") || value.startsWith("iVBOR"));
}

async function migrate() {
  console.log(EXECUTE ? "⚠️  EXECUTE MODE — changes will be committed.\n" : "🔎 DRY RUN — no changes will be written. Pass --execute to apply.\n");

  const client = await db.connect();
  let updatedProducts = 0;
  let updatedFields = 0;
  let skippedNoPath = 0;

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, image, imagefirst, imagesecond, imagethirder, imagefoure, imagefive,
              image_path, image_first_path, image_second_path, image_third_path, image_fourth_path, image_fifth_path
       FROM bouquetbar.products`
    );
    console.log(`Found ${rows.length} products\n`);

    for (const row of rows) {
      const setClauses: string[] = [];
      const values: string[] = [];

      for (const { base64Field, pathField } of FIELD_MAP) {
        const currentValue = row[base64Field];
        const pathValue = row[pathField];

        if (!looksLikeBase64(currentValue)) continue; // not base64, leave untouched
        if (!pathValue) {
          console.log(`  skip: product ${row.id} ${base64Field} is base64 but ${pathField} is NULL`);
          skippedNoPath++;
          continue;
        }

        const newUrl = `${DOMAIN}/${pathValue}`;
        setClauses.push(`${base64Field} = $${setClauses.length + 1}`);
        values.push(newUrl);
        updatedFields++;
      }

      if (setClauses.length === 0) continue;

      values.push(row.id);
      const sql = `UPDATE bouquetbar.products SET ${setClauses.join(", ")} WHERE id = $${values.length}`;
      console.log(`  update: product ${row.id} -> ${setClauses.length} field(s)`);

      if (EXECUTE) {
        await client.query(sql, values);
      }
      updatedProducts++;
    }

    if (EXECUTE) {
      await client.query("COMMIT");
      console.log("\n✅ Changes committed.");
    } else {
      await client.query("ROLLBACK");
      console.log("\n✅ Dry run complete, rolled back — no changes were written.");
    }

    console.log(`\nSummary:`);
    console.log(`  Products touched: ${updatedProducts}`);
    console.log(`  Fields updated:   ${updatedFields}`);
    console.log(`  Skipped (base64 present but path NULL): ${skippedNoPath}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

migrate();
