// The AM 360 lockup. Two cuts of the same artwork, and which one you use is decided by
// what is behind it:
//
//   variant="color"  → the real logo (teal→blue gradient). Only on LIGHT surfaces:
//                      auth cards, the landing page, white panels.
//   variant="white"  → a knockout of the same shape, painted white. On the INDIGO
//                      header. The full-colour mark on violet is two brands arguing;
//                      a knockout reads as one.
//
// Plain <img>, not next/image: these are two fixed-size static PNGs, so the optimiser
// has nothing to optimise and would only add config. The assets are pre-trimmed and
// background-keyed (see public/logo*.png) — do not re-crop them in CSS.
export default function Logo({
  variant = "color",
  height = 36,
  className,
}: {
  variant?: "color" | "white";
  height?: number;
  className?: string;
}) {
  const src = variant === "white" ? "/logo-white.png" : "/logo.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="AM 360 — Complete Academy Management"
      className={className}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
