"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { PixelArt } from "@/components/ui/empty-state";

/**
 * 404 in the Watch Dogs voice: a glitching code, "signal lost", and the way
 * back. Used at the root (no frame) and inside the app (with the menu).
 */
export function NotFoundScreen({ homeHref = "/", homeLabel = "Į pradžią" }: { homeHref?: string; homeLabel?: string }) {
  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <PixelArt name="signal" className="size-24" />
      <span className="glitch glitch-loop font-pixel text-[clamp(72px,14vw,120px)] leading-none" data-text="404">
        404
      </span>
      <span className="font-pixel text-[13px] tracking-[0.14em] text-hack uppercase">Signalas prarastas</span>
      <p className="max-w-[40ch] text-sm text-muted">
        Tokio puslapio nėra arba jo matyti negalite. Patikrinkite adresą arba grįžkite atgal.
      </p>
      <ButtonLink href={homeHref} variant="secondary" icon={ArrowLeft} className="mt-2">
        {homeLabel}
      </ButtonLink>
    </div>
  );
}

/** An unexpected error while rendering: say so plainly and offer another try. */
export function CrashScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <PixelArt name="signal" className="size-24" />
      <h1 className="font-serif text-[clamp(32px,5vw,44px)]">Kažkas sugedo</h1>
      <p className="max-w-[44ch] text-sm text-muted">
        Puslapio nepavyko parodyti. Bandykite dar kartą – jei kartojasi, perkraukite puslapį.
      </p>
      {error.digest && <code className="font-mono text-xs text-muted">ID: {error.digest}</code>}
      <Button variant="secondary" icon={RefreshCw} onClick={retry} className="mt-2">
        Bandyti dar kartą
      </Button>
    </div>
  );
}
