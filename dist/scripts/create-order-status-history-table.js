#!/usr/bin/env tsx
/**
 * One-time migration: create the bouquetbar.order_status_history table.
 * It's referenced by database-storage.ts (updateOrderStatus /
 * addOrderStatusHistory / getOrderStatusHistory) and defined in
 * shared/schema.ts, but was never actually created in the database —
 * causing every order status update to fail with:
 *   relation "bouquetbar.order_status_history" does not exist
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 *
 * Usage: npx tsx scripts/create-order-status-history-table.ts
 */
import { db } from "../db.js";
async function migrate() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS bouquetbar.order_status_history (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id varchar NOT NULL REFERENCES bouquetbar.orders(id),
        status text NOT NULL,
        note text,
        changed_at timestamp DEFAULT NOW()
      );
    `);
        console.log("✅ bouquetbar.order_status_history is ready.");
    }
    catch (error) {
        console.error("❌ Failed to create order_status_history table:", error);
        process.exitCode = 1;
    }
    finally {
        await db.end();
    }
}
migrate();
