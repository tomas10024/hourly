import { PhoneImage } from "@/components/marketing/product-image";

/**
 * The picture beside the login and registration forms: the app as it looks
 * on a phone, standing in a ctOS-framed panel. Wide screens only - below the
 * breakpoint the form has the screen to itself.
 */
export function AuthVisual() {
  return (
    <div className="hud hud-on relative hidden min-h-[560px] place-items-center overflow-hidden rounded-card border border-border bg-[radial-gradient(60%_50%_at_50%_40%,color-mix(in_srgb,var(--color-hack)_14%,transparent),transparent_70%),#070708] py-10 [--hud-color:var(--color-hack)] md:grid">
      <PhoneImage className="h-[min(520px,68dvh)] w-auto shadow-pop" />
      <span className="label absolute bottom-5 left-6">{"// hourly · telefone"}</span>
    </div>
  );
}
