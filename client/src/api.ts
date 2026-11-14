// Standalone RPC client (no @hatch/space-sdk). POSTs {action, args} as JSON
// to /api/actions and returns the typed response. Same methods and the
// same request/response shapes as server/src/actions.ts (the Muse version).
// Lưu ý: getState KHÔNG trả về mật khẩu Admin; mật khẩu chỉ được kiểm tra
// qua verifyAdminPass và đổi qua changeAdminPass.

export type ChannelStatus = "connected" | "waiting" | "disconnected";

export interface Channel {
  id: number;
  username: string;
  displayName: string;
  status: ChannelStatus;
  isActive: boolean;
}

export interface Settings {
  soundAll: boolean;
  giftSound: boolean;
  thankVoice: boolean;
  thankText: string;
  bannerText: string;
  voice: "female" | "male";
  voiceRate: number;
  stageName: string;
}

export interface GetStateResponse {
  channels: Channel[];
  settings: Settings;
}

async function callAction<T>(action: string, args: unknown): Promise<T> {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  if (!res.ok) {
    let message = `Action ${action} failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) message = body.error;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  getState: (args: Record<string, never> = {}) =>
    callAction<GetStateResponse>("getState", args),
  addChannel: (args: { username: string; displayName: string }) =>
    callAction<{ id: number }>("addChannel", args),
  setChannelStatus: (args: { id: number; status: ChannelStatus }) =>
    callAction<{ ok: true }>("setChannelStatus", args),
  setActiveChannel: (args: { id: number }) =>
    callAction<{ ok: true }>("setActiveChannel", args),
  deleteChannel: (args: { id: number }) =>
    callAction<{ ok: true }>("deleteChannel", args),
  updateSettings: (args: Settings) =>
    callAction<{ ok: true }>("updateSettings", args),
  verifyAdminPass: (args: { pass: string }) =>
    callAction<{ ok: boolean }>("verifyAdminPass", args),
  changeAdminPass: (args: { oldPass: string; newPass: string }) =>
    callAction<{ ok: true }>("changeAdminPass", args),
};

// Helpers so call sites can do `ApiResponse<typeof api, "getState">` just
// like they did with the SDK client.
export type ApiResponse<T, K extends keyof T> =
  T[K] extends (...args: never[]) => Promise<infer R> ? R : never;
export type ApiRequest<T, K extends keyof T> =
  T[K] extends (args: infer A) => unknown ? A : never;
