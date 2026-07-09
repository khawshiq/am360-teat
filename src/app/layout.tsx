import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = { title: "AM 360 — Complete Academy Management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
