// Actions for Máy In Mini Dễ Thương: shared state (TikTok channels + settings)
// used by both the Game page and the Admin page, persisted server-side.

import {
defineAction,
z,
type ActionsModule,
type Ctx,
} from "@hatch/space-sdk";
import { asc, eq } from "drizzle-orm";
import * as schema from "./schema";

const channelSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string(),
  status: z.enum(["connected", "waiting", "disconnected"]),
  isActive: z.boolean(),
});

const settingsSchema = z.object({
  soundAll: z.boolean(),
  giftSound: z.boolean(),
  thankVoice: z.boolean(),
  thankText: z.string(),
  bannerText: z.string(),
  voice: z.enum(["female", "male"]),
  voiceRate: z.number(),
  stageName: z.string(),
});

type SettingsOut = z.infer<typeof settingsSchema>;

const DEFAULT_SETTINGS: SettingsOut = {
  soundAll: true,
  giftSound: true,
  thankVoice: true,
  thankText: "Cảm ơn bạn!",
  bannerText: "Welcome {name} to the Live!",
  voice: "female",
  voiceRate: 1,
  stageName: "",
};

async function ensureSettings(ctx: Ctx): Promise<SettingsOut> {
  const db = ctx.db<typeof schema>();
  // Insert the default row first (no-op if another request already did) so
  // concurrent first loads cannot race into a duplicate-key 500.
  await db
    .insert(schema.settings)
    .values({
      id: 1,
      soundAll: 1,
      giftSound: 1,
      thankVoice: 1,
      thankText: DEFAULT_SETTINGS.thankText,
      bannerText: DEFAULT_SETTINGS.bannerText,
      voice: "female",
      voiceRate: 1,
      stageName: "",
    })
    .onConflictDoNothing();
  const rows = await db.select().from(schema.settings);
  const row = rows[0];
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    soundAll: row.soundAll === 1,
    giftSound: row.giftSound === 1,
    thankVoice: row.thankVoice === 1,
    thankText: row.thankText,
    bannerText: row.bannerText,
    voice: row.voice,
    voiceRate: row.voiceRate,
    stageName: row.stageName,
  };
}

export const Actions = {
  getState: defineAction({
    description:
      "Returns the saved TikTok channels and the shared app settings for the Game and Admin pages.",
    request: z.object({}),
    response: z.object({
      channels: z.array(channelSchema),
      settings: settingsSchema,
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const settings = await ensureSettings(ctx);
      const rows = await db
        .select()
        .from(schema.channels)
        .orderBy(asc(schema.channels.id));
      return {
        channels: rows.map((row) => ({
          id: row.id,
          username: row.username,
          displayName: row.displayName,
          status: row.status,
          isActive: row.isActive === 1,
        })),
        settings,
      };
    },
  }),

  addChannel: defineAction({
    description: "Adds a TikTok live channel by username and display name.",
    request: z.object({
      username: z.string().trim().min(1).max(60),
      displayName: z.string().trim().min(1).max(80),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const username = args.username.replace(/^@+/, "");
      const existing = await db
        .select()
        .from(schema.channels)
        .orderBy(asc(schema.channels.id));
      const result = await db
        .insert(schema.channels)
        .values({
          username,
          displayName: args.displayName,
          status: "disconnected",
          isActive: existing.length === 0 ? 1 : 0,
        })
        .returning({ id: schema.channels.id });
      const inserted = result[0];
      if (!inserted) throw new Error("addChannel: insert returned no rows");
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  setChannelStatus: defineAction({
    description:
      "Sets a channel connection status: connected, waiting, or disconnected.",
    request: z.object({
      id: z.number().int().positive(),
      status: z.enum(["connected", "waiting", "disconnected"]),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.channels)
        .set({ status: args.status })
        .where(eq(schema.channels.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  setActiveChannel: defineAction({
    description: "Makes the given channel the one currently on air.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await db.update(schema.channels).set({ isActive: 0 });
      await db
        .update(schema.channels)
        .set({ isActive: 1 })
        .where(eq(schema.channels.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  deleteChannel: defineAction({
    description:
      "Deletes a channel; if it was on air, the first remaining channel takes over.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.channels)
        .where(eq(schema.channels.id, args.id));
      const remaining = await db
        .select()
        .from(schema.channels)
        .orderBy(asc(schema.channels.id));
      if (remaining.length > 0 && !remaining.some((r) => r.isActive === 1)) {
        const first = remaining[0];
        if (first) {
          await db
            .update(schema.channels)
            .set({ isActive: 1 })
            .where(eq(schema.channels.id, first.id));
        }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  updateSettings: defineAction({
    description:
      "Saves shared settings: sound toggles, thank-you and banner text, TTS voice and rate, stage channel name.",
    request: settingsSchema,
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await ensureSettings(ctx);
      await db
        .update(schema.settings)
        .set({
          soundAll: args.soundAll ? 1 : 0,
          giftSound: args.giftSound ? 1 : 0,
          thankVoice: args.thankVoice ? 1 : 0,
          thankText: args.thankText,
          bannerText: args.bannerText,
          voice: args.voice,
          voiceRate: args.voiceRate,
          stageName: args.stageName,
        })
        .where(eq(schema.settings.id, 1));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),
} satisfies ActionsModule;
