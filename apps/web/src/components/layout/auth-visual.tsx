/**
 * The picture beside the login and registration forms (wide screens only).
 *
 * TEMPORARY stand-in drawn in CSS: stage F replaces it with a screenshot of
 * the real work log (`next/image`, scaled with the window). The scan lines
 * and colour wash are a CSS overlay, so the screenshot itself stays clean.
 */
export function AuthVisual() {
  const rows = [
    ["Ataskaitų šablonai", "3 val. 15 min.", "146,25 €"],
    ["Užsakymų sąrašas", "2 val. 40 min.", "93,33 €"],
    ["Registracijos forma", "1 val. 30 min.", "45,00 €"],
  ];

  return (
    <div className="hud hud-on relative hidden min-h-[520px] overflow-hidden rounded-card border border-border-strong bg-[#070708] [--hud-color:var(--color-hack)] md:block">
      <div className="absolute inset-0 grid content-start gap-7 p-10">
        <span className="label">{"// darbo žurnalas"}</span>
        <div className="grid gap-2">
          <span className="inline-flex items-center gap-2 font-pixel text-xs tracking-[0.1em] text-hack">
            <span className="dot-live size-[7px] rounded-full bg-hack" /> REC · VYKDOMA SESIJA
          </span>
          <span className="font-mono text-[64px] leading-none tabular-nums">01:23:10</span>
          <span className="text-sm text-muted">Sandėlio likučių ataskaitos · 45 €/val.</span>
        </div>
        <ul className="grid gap-0 border-t border-border">
          {rows.map(([task, duration, amount]) => (
            <li key={task} className="grid grid-cols-[1fr_auto_auto] gap-6 border-b border-border py-3 text-sm">
              <span>{task}</span>
              <span className="font-mono text-muted">{duration}</span>
              <span className="font-mono">{amount}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-hard-light"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.32) 0 1px, transparent 1px 3px), linear-gradient(135deg, color-mix(in srgb, var(--color-hack) 16%, transparent), color-mix(in srgb, var(--color-data) 12%, transparent))",
        }}
      />
    </div>
  );
}
