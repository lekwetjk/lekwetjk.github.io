import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const memberUsers = sqliteTable("member_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  passwordHash: text("password_hash").notNull(),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberUserLogos = sqliteTable("member_user_logos", {
  userId: text("user_id").primaryKey(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberProfiles = sqliteTable("member_profiles", {
  userId: text("user_id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberExportPermitOptions = sqliteTable("member_export_permit_options", {
  name: text("name").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberDocuments = sqliteTable("member_documents", {
  fileName: text("file_name").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
