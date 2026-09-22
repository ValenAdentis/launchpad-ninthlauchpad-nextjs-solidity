"use client";

import { useReadContract } from "wagmi";
import { useTokenAvatar } from "@/lib/avatars";
import { launchTokenAbi, tokenColors } from "@/lib/launchpad";
import type { Address } from "viem";

const sizes = {
  sm: "h-9 w-9 rounded-lg text-xs",
  md: "h-11 w-11 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg",
} as const;

export function TokenIcon({
  address,
  symbol,
  size = "md",
}: {
  address: Address;
  symbol?: string;
  size?: keyof typeof sizes;
}) {
  const { data: onChainImage } = useReadContract({
    address,
    abi: launchTokenAbi,
    functionName: "imageUri",
  });
  const stored = useTokenAvatar(address);
  const image =
    onChainImage && onChainImage.length > 0 ? onChainImage : stored;
  const [from, to] = tokenColors(address);

  if (image) {
    return (
      <span
        className={`grid shrink-0 place-items-center overflow-hidden ring-1 ring-white/15 ${sizes[size]}`}
        style={{
          backgroundImage: `url("${image}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label={symbol ?? "token avatar"}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center font-bold text-white/90 ring-1 ring-white/15 ${sizes[size]}`}
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 10px 28px -10px ${from}`,
      }}
    >
      {(symbol ?? "?").slice(0, 4)}
    </span>
  );
}