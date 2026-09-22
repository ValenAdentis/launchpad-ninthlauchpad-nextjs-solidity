import type { Metadata } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LaunchPad Simple",
  description: "Create and trade tokens on a linear bonding curve.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-100">
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="bg-grid absolute inset-0" />
          <div className="aurora-orb left-[-12%] top-[-18%] h-[520px] w-[520px] bg-[#6CFF32]/10" />
          <div
            className="aurora-orb right-[-14%] top-[6%] h-[460px] w-[460px] bg-[#6CFF32]/[0.07]"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="aurora-orb bottom-[-28%] left-[18%] h-[560px] w-[560px] bg-emerald-400/10"
            style={{ animationDelay: "-12s" }}
          />
          <div
            className="aurora-orb bottom-[-30%] right-[10%] h-[420px] w-[420px] bg-lime-400/[0.08]"
            style={{ animationDelay: "-3s" }}
          />
        </div>
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}