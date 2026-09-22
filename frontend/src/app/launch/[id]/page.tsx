"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { Header } from "@/components/header";
import { LaunchView } from "@/components/launch-view";
import { SetupNotice } from "@/components/setup-notice";
import {
  LAUNCHPAD_ADDRESS,
  isLaunchpadConfigured,
  launchpadAbi,
  toLaunch,
} from "@/lib/launchpad";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function LaunchPage() {
  const params = useParams<{ id: string }>();

  let id: bigint | undefined;
  try {
    id = params?.id ? BigInt(params.id) : undefined;
  } catch {
    id = undefined;
  }

  const { data, isLoading } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "launches",
    args: id != null ? [id] : undefined,
    query: { enabled: isLaunchpadConfigured && id != null },
  });

  const launch =
    data && id != null && data[0] !== ZERO_ADDRESS ? toLaunch(id, data) : undefined;

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
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
          Back to launches
        </Link>

        {!isLaunchpadConfigured ? (
          <div className="animate-float-in">
            <SetupNotice />
          </div>
        ) : !id ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-red-300">
            Invalid launch id.
          </p>
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-3xl bg-white/[0.03]" />
            <div className="h-40 rounded-3xl bg-white/[0.03]" />
          </div>
        ) : !launch ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
            Launch #{id.toString()} not found.
          </p>
        ) : (
          <LaunchView launch={launch} />
        )}
      </main>
    </div>
  );
}