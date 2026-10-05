import { cx } from "@/lib/cx";

/*
 * Pictures of the product for the public pages.
 *
 * TEMPORARY: drawn in CSS until stage F puts real screenshots of the app here
 * (`next/image` with `fill` and `sizes`, so the picture scales with the
 * window). The frame - aspect ratio, border, scan-line overlay - stays the
 * same, so swapping the content will not move the layout.
 */

type Variant = "workspace" | "timer" | "report" | "share";

const LABELS: Record<Variant, string> = {
  workspace: "Hourly darbo aplinka: projekto užduotys ir veikiantis laikmatis",
  timer: "Laikmatis prie užduoties",
  report: "Projekto ataskaita su suma",
  share: "Užsakovo peržiūros nuoroda",
};

export function ProductShot({ variant, className }: { variant: Variant; className?: string }) {
  return (
    <div
      role="img"
      aria-label={LABELS[variant]}
      className={cx(
        "relative aspect-[16/10] w-full max-w-full overflow-hidden rounded-card border border-border-strong bg-[#070708]",
        className,
      )}
    >
      {variant === "workspace" && <Workspace />}
      {variant === "timer" && <Timer />}
      {variant === "report" && <Report />}
      {variant === "share" && <Share />}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-hard-light"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.3) 0 1px, transparent 1px 3px), linear-gradient(135deg, color-mix(in srgb, var(--color-hack) 14%, transparent), color-mix(in srgb, var(--color-data) 10%, transparent))",
        }}
      />
    </div>
  );
}

const bar = "block h-[7px] rounded bg-white/12";

function Workspace() {
  return (
    <div className="absolute inset-0 grid grid-cols-[24%_1fr]">
      <div className="grid content-start gap-3 border-r border-border p-[8%_9%]">
        <span className={cx(bar, "w-3/5 bg-hack")} />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cx(bar, i % 2 ? "w-4/5" : "w-full")} />
        ))}
      </div>
      <div className="grid content-start gap-[6%] p-[6%_7%]">
        <div className="flex items-center justify-between">
          <span className="font-serif text-[clamp(12px,2.2vw,22px)]">Sandėlio likučių ataskaitos</span>
          <span className="flex items-center gap-1.5 rounded-full border border-hack/60 px-2 py-0.5 font-mono text-[clamp(8px,1.1vw,12px)]">
            <span className="dot-live size-1.5 rounded-full bg-hack text-hack" /> 01:23:10
          </span>
        </div>
        <div className="grid gap-2.5">
          {["Duomenų šaltinių auditas", "Ataskaitų šablonai", "Automatinis siuntimas", "Eksportas į Excel"].map((t, i) => (
            <div key={t} className="flex items-center justify-between border-b border-border pb-2 text-[clamp(8px,1.1vw,12px)]">
              <span>{t}</span>
              <span className={cx("rounded border px-1.5", i === 1 ? "border-hack/50 text-hack" : i === 0 ? "border-ok/50 text-ok" : "border-white/20 text-muted")}>
                {i === 0 ? "Atlikta" : i === 1 ? "Vykdoma" : "Laukia"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Timer() {
  return (
    <div className="absolute inset-0 grid content-center gap-2 p-[9%]">
      <span className="font-pixel text-[clamp(8px,1.2vw,11px)] tracking-[0.1em] text-hack">● REC · VYKDOMA SESIJA</span>
      <span className="font-mono text-[clamp(28px,6vw,56px)] leading-none tabular-nums">01:23:10</span>
      <span className="text-[clamp(9px,1.2vw,13px)] text-muted">Ataskaitų šablonai · 45 €/val. · 62,38 €</span>
    </div>
  );
}

function Report() {
  const rows = [
    ["Duomenų šaltinių auditas", "12,0", "540,00 €"],
    ["Ataskaitų šablonai", "9,5", "427,50 €"],
    ["Iš viso", "21,5", "967,50 €"],
  ];
  return (
    <div className="absolute inset-0 grid content-center gap-0 p-[8%]">
      {rows.map(([t, h, s], i) => (
        <div
          key={t}
          className={cx(
            "grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border py-[3%] text-[clamp(9px,1.25vw,13px)]",
            i === rows.length - 1 && "border-b-0 font-semibold",
          )}
        >
          <span>{t}</span>
          <span className="font-mono text-muted">{h} val.</span>
          <span className={cx("font-mono", i === rows.length - 1 && "text-data")}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function Share() {
  return (
    <div className="absolute inset-0 grid content-center gap-3 p-[9%]">
      <span className="w-fit rounded border border-data/50 px-2 py-0.5 text-[clamp(8px,1.1vw,12px)] text-data">Tik skaitymui</span>
      <span className="truncate rounded-lg border border-border-strong bg-surface-2 px-3 py-2 font-mono text-[clamp(9px,1.2vw,13px)]">
        hourly.lt/p/k3Jd9xQe2m7LpA0
      </span>
      <span className="text-[clamp(9px,1.2vw,13px)] text-muted">Galioja iki 2026-10-19 · peržiūrėta prieš 2 val.</span>
    </div>
  );
}
