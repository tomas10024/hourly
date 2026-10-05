import { ArrowRight, Briefcase, UserPlus } from "lucide-react";
import { HeroImage, ProductImage } from "@/components/marketing/product-image";
import { RoleSticker } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    shot: "timer" as const,
    title: "Laikmatis prie užduoties",
    text: "Paleiskite laikmatį prie konkrečios užduoties arba įveskite sesiją ranka. Valandos ir suma susiskaičiuoja pačios.",
  },
  {
    shot: "report" as const,
    title: "Ataskaita vienu paspaudimu",
    text: "Laikas ir suma pagal kiekvieną užduotį ir sutartą įkainį. Ataskaitą galima parsisiųsti CSV formatu.",
  },
  {
    shot: "share" as const,
    title: "Nuoroda užsakovui",
    text: "Užsakovas be paskyros mato darbo eigą per laikiną, tik skaitymui skirtą nuorodą. Ją galite bet kada atšaukti.",
  },
];

const ROLES = [
  {
    role: "CLIENT" as const,
    title: "Užsakovui",
    text: "Paskelbkite projektą su biudžetu ir terminu, palyginkite gautus pasiūlymus, o darbui prasidėjus matykite, kur eina laikas.",
  },
  {
    role: "SPECIALIST" as const,
    title: "Specialistui",
    text: "Teikite pasiūlymus aikštelėje arba susikurkite tiesiogiai sutartą darbą. Registruokite sesijas ir formuokite ataskaitas.",
  },
  {
    role: "ADMIN" as const,
    title: "Administratoriui",
    text: "Prižiūrėkite naudotojus ir projektus, blokuokite pažeidėjus ir peržiūrėkite bet kurio projekto darbo istoriją.",
  },
];

const section = "mx-auto w-full max-w-6xl px-[clamp(16px,4vw,32px)]";

/** The front page: what Hourly is, how it works, who it is for, and the way in. */
export default function HomePage() {
  return (
    <>
      <section className={`${section} grid items-center gap-12 pt-16 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:pt-24`}>
        <div className="fade-up grid gap-6">
          <span className="label">{"// laiko apskaita · darbų aikštelė"}</span>
          <h1 className="heading-display text-[clamp(48px,7.4vw,92px)] leading-[0.98]">
            Laikas, kurį galima <em>parodyti</em>
          </h1>
          <p className="max-w-[46ch] text-[17px] text-muted">
            Užsakovas mato, prie ko dirbama ir kiek tai kainuoja. Specialistas registruoja darbo sesijas ir vienu
            paspaudimu suformuoja ataskaitą.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href="/register" variant="hack" icon={UserPlus} glitch>
              Registruotis
            </ButtonLink>
            <ButtonLink href="/projects" variant="secondary" icon={Briefcase}>
              Naršyti aikštelę
            </ButtonLink>
          </div>
        </div>
        <HeroImage className="fade-up [animation-delay:120ms]" />
      </section>

      <section id="kaip-veikia" className={`${section} grid scroll-mt-20 gap-8 border-t border-border py-20`}>
        <div className="grid gap-2">
          <span className="label">{"// kaip veikia"}</span>
          <h2 className="font-serif text-[clamp(32px,4.5vw,48px)] leading-tight">Nuo pasiūlymo iki ataskaitos</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} hud className="grid content-start gap-4 p-4">
              <ProductImage shot={feature.shot} sizes="(min-width: 64rem) 340px, (min-width: 48rem) 33vw, 100vw" />
              <div className="grid gap-1.5 px-1 pb-1">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={`${section} grid gap-8 border-t border-border py-20`}>
        <div className="grid gap-2">
          <span className="label">{"// kam skirta"}</span>
          <h2 className="font-serif text-[clamp(32px,4.5vw,48px)] leading-tight">Trys rolės, viena darbo eiga</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ROLES.map((item) => (
            <Card key={item.role} className="grid content-start gap-3">
              <RoleSticker role={item.role} className="w-fit" />
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="text-sm text-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={`${section} pb-24`}>
        <div className="hud hud-on flex flex-wrap items-center justify-between gap-6 border border-border-strong bg-surface px-8 py-10 [--hud-color:var(--color-hack)]">
          <div className="grid gap-2">
            <h2 className="font-serif text-[clamp(28px,4vw,40px)] leading-tight">Pradėkite registruoti laiką šiandien</h2>
            <p className="text-sm text-muted">Paskyra nemokama. Užtrunka mažiau nei minutę.</p>
          </div>
          <ButtonLink href="/register" variant="primary" icon={ArrowRight}>
            Sukurti paskyrą
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
