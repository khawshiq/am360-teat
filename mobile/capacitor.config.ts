import type { CapacitorConfig } from "@capacitor/cli";

// The Android app is a thin native shell that loads the hosted AM360 web app.
// Because it points at server.url, every Vercel deploy updates the app instantly.
// If you move to a custom domain, update `server.url` (and the assetlinks later).
const config: CapacitorConfig = {
  appId: "com.am360.app",
  appName: "AM 360",
  webDir: "www", // placeholder shell shown only if the remote URL can't load
  // Mark the WebView's user agent so the web app can tell it's running in-app
  // (used to hide Google Sign-In, which Google blocks inside WebViews).
  appendUserAgent: "AM360App",
  server: {
    url: "https://am360-teat.vercel.app",
    cleartext: false,
    // Keep these hosts inside the app's WebView (Razorpay checkout).
    allowNavigation: ["checkout.razorpay.com", "api.razorpay.com", "*.razorpay.com"],
  },
  android: {
    backgroundColor: "#0a0a0e",
  },
};

export default config;
