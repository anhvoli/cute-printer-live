// Game page: the 9:16 printer stage fills the screen. The simulated live
// runs continuously here — there are no controls on this page (the Admin
// page is reached by its own URL). This is the page pasted into TikTok
// LIVE Studio as a 1080x1920 browser source (sound only plays here).

import { PrinterStage } from "../components/PrinterStage";
import type { Settings } from "../App";
import type { LiveEngine } from "../lib/live";

export function GamePage({
  engine,
  settings,
}: {
  engine: LiveEngine;
  settings: Settings;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950">
      <div className="relative h-[min(100dvh,177.78vw)] w-[min(100vw,56.25dvh)]">
        <PrinterStage
          banner={engine.banner}
          events={engine.events}
          printingId={engine.printingId}
          printingGift={engine.printingGift}
          giftCounts={engine.giftCounts}
          settings={{ thankText: settings.thankText }}
        />
      </div>
    </div>
  );
}
