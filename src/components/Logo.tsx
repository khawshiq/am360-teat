// The AM 360 lockup. Four cuts of one artwork, along two axes.
//
// `variant` — decided by what is BEHIND it:
//   "color"  → the real logo (teal→blue gradient). LIGHT surfaces only: auth cards,
//              the landing page, white panels.
//   "white"  → a knockout of the same shape. The INDIGO header. The full-colour mark on
//              violet is two brands arguing; a knockout reads as one.
//
// `compact` — decided by how BIG it is:
//   false → the full lockup, including the "Complete Academy Management" tagline. Only
//           where it renders ≥ 40px tall.
//   true  → emblem + "AM360", tagline removed. USE THIS IN THE HEADER. At 34–38px the
//           full lockup scales its tagline down to ~3px and it turns to grey mush — the
//           tagline is not small text, it is noise at that size. Cropping it is what
//           makes the mark legible, not shrinking it further.
//
// Plain <img>, not next/image: fixed-size static PNGs, so the optimiser has nothing to
// optimise and would only add config. Assets are pre-trimmed and background-keyed (see
// public/logo*.png) — do not re-crop them in CSS.
export default function Logo({
  variant = "color",
  compact = false,
  height = 36,
  className,
}: {
  variant?: "color" | "white";
  compact?: boolean;
  height?: number;
  className?: string;
}) {
  const src = compact
    ? (variant === "white" ? "/logo-compact-white.png" : "/logo-compact.png")
    : (variant === "white" ? "/logo-white.png" : "/logo.png");
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
