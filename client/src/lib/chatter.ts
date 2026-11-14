// Mấy luật "nói chuyện" lấy từ Thắp Sáng Bản Đồ (src/live/chatter.ts —
// gốc từ Đi Chùa Online, đã chạy thật trên live). Chỉ port những gì máy
// in dùng được: plain() + GiftThanker. KHÔNG port OncePerPerson,
// WishLimiter, detectWish, makePicker — máy in không có lời cầu chúc
// hay trả lời comment theo chủ đề.

// Bỏ dấu, thường hoá, 1 khoảng trắng, có khoảng trắng 2 đầu: "Cầu Bình An" -> " cau binh an "
export const plain = (text: string) =>
  ` ${text
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "") // bỏ dấu tổ hợp (NFD)
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

// ---------- Cảm ơn quà ----------

/**
 * Quà combo (x5, x10...) và quà tặng liên tục của cùng 1 người: chỉ cảm ơn 1 lần mỗi `cooldownMs`.
 * Quà to (>= bigCoins xu) luôn được cảm ơn. Quà nhỏ bị bỏ khi hàng câu quà đã dài (live đông).
 * Máy in chỉ dùng luật này cho GIỌNG ĐỌC cảm ơn — thẻ cảm ơn vẫn in cho mọi món quà.
 */
export class GiftThanker {
  private last = new Map<string, number>();
  constructor(
    private cooldownMs = 30_000,
    private bigCoins = 99,
    private maxWaiting = 6,
  ) {}
  shouldThank(username: string, coins: number, giftLinesWaiting: number, now = Date.now()) {
    const key = username.toLowerCase();
    const big = coins >= this.bigCoins;
    if (!big && now - (this.last.get(key) ?? -Infinity) < this.cooldownMs) return false;
    if (!big && giftLinesWaiting >= this.maxWaiting) return false;
    this.last.set(key, now);
    return true;
  }
  reset() {
    this.last.clear();
  }
}
