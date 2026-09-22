"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  LAUNCHPAD_ADDRESS,
  formatEth,
  formatTokenAmount,
  isLaunchpadConfigured,
  launchpadAbi,
  launchTokenAbi,
  type Launch,
} from "@/lib/launchpad";

function parseEtherSafe(value: string): bigint | null {
  try {
    if (!value.trim()) return null;
    const parsed = parseEther(value.trim());
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function TradePanel({ launch }: { launch: Launch }) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [ethAmount, setEthAmount] = useState("0.01");
  const [tokenAmount, setTokenAmount] = useState("");

  const buyAmount = parseEtherSafe(ethAmount);
  const sellAmount = parseEtherSafe(tokenAmount);

  const { data: buyQuote } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "quoteBuy",
    args: [launch.id, buyAmount ?? 0n],
    query: {
      enabled: isLaunchpadConfigured && mode === "buy" && buyAmount != null,
    },
  });

  const { data: sellQuote } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "quoteSell",
    args: [launch.id, sellAmount ?? 0n],
    query: {
      enabled: isLaunchpadConfigured && mode === "sell" && sellAmount != null,
    },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: launch.token,
    abi: launchTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: launch.token,
    abi: launchTokenAbi,
    functionName: "allowance",
    args: address ? [address, LAUNCHPAD_ADDRESS] : undefined,
    query: { enabled: !!address && isLaunchpadConfigured },
  });

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    void queryClient.invalidateQueries();
    void refetchBalance();
    void refetchAllowance();
  }, [isSuccess, queryClient, refetchBalance, refetchAllowance]);

  const needsApproval =
    mode === "sell" && sellAmount != null && (allowance ?? 0n) < sellAmount;

  function onBuy() {
    if (buyAmount == null) return;
    writeContract({
      address: LAUNCHPAD_ADDRESS,
      abi: launchpadAbi,
      functionName: "buy",
      args: [launch.id],
      value: buyAmount,
    });
  }

  function onApprove() {
    if (sellAmount == null) return;
    writeContract({
      address: launch.token,
      abi: launchTokenAbi,
      functionName: "approve",
      args: [LAUNCHPAD_ADDRESS, sellAmount],
    });
  }

  function onSell() {
    if (sellAmount == null) return;
    writeContract({
      address: LAUNCHPAD_ADDRESS,
      abi: launchpadAbi,
      functionName: "sell",
      args: [launch.id, sellAmount],
    });
  }

  const busy = isPending || isConfirming;
  const soldOut = launch.graduated;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
        {(["buy", "sell"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
className={`rounded-lg py-2.5 text-sm font-bold capitalize transition ${
                mode === tab
                  ? "bg-[#6CFF32] text-[#0a0a0a] shadow-[0_8px_20px_-8px_rgba(108,255,50,0.7)]"
                  : "text-sage/60 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {mode === "buy" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400">Amount to spend</label>
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-zinc-400">
                ETH
              </span>
            </div>
            <input
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              inputMode="decimal"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-mono text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2.5 rounded-2xl bg-black/20 p-4 text-sm">
            <Row label="You receive" value={`${formatTokenAmount(buyQuote?.[0] ?? 0n)} tokens`} />
            <Row label="Curve spend" value={`${formatEth(buyQuote?.[2] ?? 0n)} ETH`} />
            <Row label="Fee" value={`${formatEth(buyQuote?.[1] ?? 0n)} ETH`} />
          </div>
          <button
            onClick={onBuy}
            disabled={!isConnected || busy || buyAmount == null || soldOut}
            className="button-shine w-full rounded-xl bg-[#6CFF32] px-4 py-3.5 text-sm font-extrabold text-[#0a0a0a] shadow-[0_12px_32px_-10px_rgba(108,255,50,0.6)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {soldOut ? "Sold out" : busy ? "Buying…" : isConnected ? "Buy" : "Connect wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400">Amount to sell</label>
              <button
                onClick={() => balance != null && setTokenAmount(formatUnits(balance, 18))}
                className="text-xs font-medium text-primary transition hover:text-primary/70"
              >
                Max: {formatTokenAmount(balance ?? 0n)}
              </button>
            </div>
            <input
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-mono text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2.5 rounded-2xl bg-black/20 p-4 text-sm">
            <Row label="You receive" value={`${formatEth(sellQuote?.[0] ?? 0n)} ETH`} />
            <Row label="Fee" value={`${formatEth(sellQuote?.[1] ?? 0n)} ETH`} />
          </div>
          {needsApproval ? (
            <button
              onClick={onApprove}
              disabled={!isConnected || busy || sellAmount == null}
              className="button-shine w-full rounded-xl bg-[#6CFF32] px-4 py-3.5 text-sm font-extrabold text-[#0a0a0a] shadow-[0_12px_32px_-10px_rgba(108,255,50,0.6)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? "Approving…" : `Approve ${formatTokenAmount(sellAmount ?? 0n)} tokens`}
            </button>
          ) : (
            <button
              onClick={onSell}
              disabled={!isConnected || busy || sellAmount == null}
              className="button-shine w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_-10px_rgba(244,63,94,0.6)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? "Selling…" : isConnected ? "Sell" : "Connect wallet"}
            </button>
          )}
        </div>
      )}

      {writeError && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {writeError.message.split("\n")[0]}
        </p>
      )}
      {isConfirming && <p className="mt-4 text-xs text-zinc-400">Waiting for confirmation…</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-100">{value}</span>
    </div>
  );
}