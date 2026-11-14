// Drizzle schema for this space.
//
// Tables:
// - channels: TikTok live channels managed from the Admin page.
// - settings: single-row (id = 1) app settings shared by Game + Admin pages.

import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status", {
    enum: ["connected", "waiting", "disconnected"],
  })
    .notNull()
    .default("disconnected"),
  isActive: integer("is_active").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  soundAll: integer("sound_all").notNull().default(1),
  giftSound: integer("gift_sound").notNull().default(1),
  thankVoice: integer("thank_voice").notNull().default(1),
  thankText: text("thank_text").notNull().default("Cảm ơn bạn!"),
  bannerText: text("banner_text")
    .notNull()
    .default("Welcome {name} to the Live!"),
  voice: text("voice", { enum: ["female", "male"] })
    .notNull()
    .default("female"),
  voiceRate: real("voice_rate").notNull().default(1),
  stageName: text("stage_name").notNull().default(""),
});
