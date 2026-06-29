import "./globals.css";
import { AuthProvider } from "@/context/auth";

export const metadata = { title: "AM 360 — Complete Academy Management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>
  );
}
