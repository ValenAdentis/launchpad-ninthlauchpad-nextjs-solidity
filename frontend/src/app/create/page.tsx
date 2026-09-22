"use client";

import Link from "next/link";
import { CreateLaunchForm } from "@/components/create-launch-form";
import { Header } from "@/components/header";
import { SetupNotice } from "@/components/setup-notice";
import { isLaunchpadConfigured } from "@/lib/launchpad";

const STEPS = ["Token info", "Bonding curve", "Launch"];

export default function CreatePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8">
          <Link
            href="/"
            className="group mb-4 inline-flex items-center gap-2 text-sm text-sage/60 transition hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to explore
          </Link>

          <div className="relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-panel/80 px-6 py-8 backdrop-blur sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(520px circle at 90% -30%, rgba(108,255,50,0.14), transparent 60%)",
              }}
            />
            <div className="relative">
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                Create <span className="text-primary">Token</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-sage/60">
                Deploy a fixed-supply token sold along a linear bonding curve. No technical skills
                needed — it takes seconds.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {STEPS.map((step, i) => (
                  <span
                    key={step}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/30 px-3 py-1.5 text-xs text-sage/70"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!isLaunchpadConfigured ? (
          <div className="animate-float-in">
            <SetupNotice />
          </div>
        ) : (
          <CreateLaunchForm />
        )}
      </main>
    </div>
  );
}