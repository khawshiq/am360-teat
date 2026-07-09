# AM 360 — Android app (Capacitor)

A thin native Android shell that loads the hosted AM360 web app
(`server.url` in `capacitor.config.ts`). Every Vercel deploy updates the app
automatically. Google Sign-In is hidden inside the app (WebViews block Google
OAuth); email/password works, and Google login stays available on the web.

## Build the APK (no local Android tooling needed)

The GitHub Actions workflow **Build Android app** builds a debug APK in the cloud:

1. Push to `am360-fetcher`/`main` (or run it manually: GitHub → **Actions** →
   *Build Android app* → **Run workflow**).
2. Open the finished run → **Artifacts** → download `am360-debug-apk`.
3. Copy `app-debug.apk` to an Android phone and install it (allow "install from
   unknown sources"). It opens the AM360 app full-screen.

## Building locally (optional)

Requires Android Studio + JDK 17:

```bash
cd mobile
npm install
npx cap add android        # generates android/ (gitignored)
npx cap sync android
npx cap open android       # build/run from Android Studio
```

## Going to the Play Store (later)

The Play Store needs a **signed release AAB**. That means:
- Generate an upload keystore (`keytool -genkey ...`).
- Add it + passwords as GitHub secrets and extend the workflow to run
  `./gradlew bundleRelease` with signing.
- Upload the AAB in the Play Console.

Change `appId` / `appName` / `server.url` in `capacitor.config.ts` before your
first Play upload (the `appId` becomes your permanent package name).
