// The WhatsApp brand mark — used only to identify the WhatsApp integration itself
// (its settings page, its connect form, its notifications compose screen), same
// exception this app already makes for Google's "G" on the sign-in button and
// Razorpay's brand color inside its own checkout (see globals.css's note on the four
// places literal hex values are allowed). Never reused as a dashboard identity hue,
// a chart color, or a button — those stay inside the validated palette.
export default function WhatsAppMark({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%", background: "#25D366",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5 0 1.7.45 3.3 1.24 4.68L2.5 21.5l5.02-1.32A9.46 9.46 0 0 0 12 21.5c5.25 0 9.5-4.25 9.5-9.5S17.25 2.5 12 2.5z"
          fill="#fff"
        />
        <path
          d="M12 3.9c-4.47 0-8.1 3.63-8.1 8.1 0 1.56.44 3.02 1.21 4.26l.19.3-.81 2.95 3.03-.79.3.18A8.06 8.06 0 0 0 12 20.1c4.47 0 8.1-3.63 8.1-8.1S16.47 3.9 12 3.9z"
          fill="#25D366"
        />
        <path
          d="M9.4 7.7c-.19-.43-.38-.44-.56-.45h-.48c-.17 0-.44.07-.68.32-.23.26-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.78 2.72 4.39 3.71 2.17.83 2.61.66 3.08.63.47-.05 1.52-.62 1.74-1.22.21-.6.21-1.11.15-1.22-.07-.11-.24-.17-.5-.3-.26-.13-1.52-.75-1.76-.84-.23-.08-.4-.13-.58.13-.17.26-.66.84-.81 1.01-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.07-1.28-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.42-.79-1.95z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}
