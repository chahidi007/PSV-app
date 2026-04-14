import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expertsTable = pgTable("experts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExpertSchema = createInsertSchema(expertsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const selectExpertSchema = createSelectSchema(expertsTable);

export type InsertExpert = z.infer<typeof insertExpertSchema>;
export type Expert = typeof expertsTable.$inferSelect;
