// True when the page is running inside the AM360 native (Capacitor) WebView.
// The native shell appends "AM360App" to its user agent (see capacitor.config.ts).
// Google Sign-In is blocked in WebViews, so we hide it in the app and rely on
// email/password there; Google login remains available on the web.
export const isNativeApp = () =>
  typeof navigator !== "undefined" && /AM360App/i.test(navigator.userAgent);
