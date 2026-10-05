import Image, { getImageProps, type StaticImageData } from "next/image";
import report from "@/assets/screens/report.webp";
import share from "@/assets/screens/share.webp";
import timer from "@/assets/screens/timer.webp";
import workspaceMobile from "@/assets/screens/workspace-mobile.webp";
import workspace from "@/assets/screens/workspace.webp";
import { cx } from "@/lib/cx";

/*
 * Screenshots of the real app on the public pages (`src/assets/screens/*.webp`,
 * taken from this application with demo data).
 *
 * The images are imported statically, so Next.js knows their size (no layout
 * shift), shows a blurred placeholder while they load, and serves each one
 * through `next/image` as AVIF/WebP in several widths (`srcset`). `sizes`
 * tells the browser how wide the picture will be at each window size, so a
 * phone downloads a small file and a wide screen a large one.
 *
 * The scan lines are a CSS layer on top, not part of the files, so the same
 * screenshots work in the report.
 */

const SHOTS = {
  timer: { src: timer, alt: "Darbo žurnalas: veikiantis laikmatis prie užduoties su sukaupta suma" },
  report: { src: report, alt: "Projekto ataskaita: laikas ir suma pagal kiekvieną užduotį" },
  share: { src: share, alt: "Užsakovo peržiūros nuoroda: užduočių būsenos, valandos ir suma" },
} satisfies Record<string, { src: StaticImageData; alt: string }>;

function Overlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.22) 0 1px, transparent 1px 3px)" }}
    />
  );
}

const frame = "relative w-full max-w-full overflow-hidden rounded-card border border-border-strong bg-[#070708]";

/** A screenshot in a 16:10 frame that fills the width of its column. */
export function ProductImage({
  shot,
  sizes,
  className,
}: {
  shot: keyof typeof SHOTS;
  /** How wide the picture is drawn, e.g. "(min-width: 48rem) 33vw, 100vw". */
  sizes: string;
  className?: string;
}) {
  const { src, alt } = SHOTS[shot];
  return (
    <div className={cx(frame, "aspect-[16/10]", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} placeholder="blur" className="object-cover object-top" />
      <Overlay />
    </div>
  );
}

/**
 * The front-page picture, with art direction: a wide screen gets the desktop
 * workspace (16:10), a phone the same page as the phone shows it (4:5, top
 * part). `<picture>` lets the browser pick the file by the media query, and
 * only the one it picks is downloaded.
 */
export function HeroImage({ className }: { className?: string }) {
  const alt = "Hourly darbo aplinka: projekto užduotys, jų būsenos ir veikiantis laikmatis viršuje";
  const {
    props: { srcSet: desktop },
  } = getImageProps({ src: workspace, alt, sizes: "(min-width: 48rem) 55vw, 100vw" });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ src: workspaceMobile, alt, sizes: "100vw", fetchPriority: "high", loading: "eager" });

  return (
    <div className={cx(frame, "aspect-[4/5] md:aspect-[16/10]", className)}>
      <picture>
        <source media="(min-width: 48rem)" srcSet={desktop} />
        <source srcSet={mobile} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img {...rest} className="absolute inset-0 h-full w-full object-cover object-top" />
      </picture>
      <Overlay />
    </div>
  );
}

/** The phone screenshot as a framed device (beside the login form). */
export function PhoneImage({ className }: { className?: string }) {
  return (
    <Image
      src={workspaceMobile}
      alt="Hourly telefone: projekto užduotys ir veikiantis laikmatis"
      sizes="300px"
      placeholder="blur"
      className={cx("rounded-[28px] border border-border-strong", className)}
    />
  );
}
