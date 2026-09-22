import { formatEther, formatUnits } from "viem";

/** Address of the deployed Launchpad on Base Sepolia. Override via NEXT_PUBLIC_LAUNCHPAD_ADDRESS. */
export const LAUNCHPAD_ADDRESS = (process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS ??
  "0x17818f88a3B3064A2448Ad54cb2d1cfC5C3b59A2") as `0x${string}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** True when a plausible, non-zero Launchpad address is configured. */
export const isLaunchpadConfigured =
  /^0x[0-9a-fA-F]{40}$/.test(LAUNCHPAD_ADDRESS) &&
  LAUNCHPAD_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

export const launchpadAbi = [
  {
    type: "function",
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launchCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeRecipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "protocolFees",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "creatorFees",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launches",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "totalSupply", type: "uint256" },
      { name: "tokensSold", type: "uint256" },
      { name: "ethReserve", type: "uint256" },
      { name: "basePrice", type: "uint256" },
      { name: "slope", type: "uint256" },
      { name: "buyTaxBps", type: "uint256" },
      { name: "sellTaxBps", type: "uint256" },
      { name: "graduated", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getAllLaunches",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "totalSupply", type: "uint256" },
          { name: "tokensSold", type: "uint256" },
          { name: "ethReserve", type: "uint256" },
          { name: "basePrice", type: "uint256" },
          { name: "slope", type: "uint256" },
          { name: "buyTaxBps", type: "uint256" },
          { name: "sellTaxBps", type: "uint256" },
          { name: "graduated", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "priceOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "quoteBuy",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "ethIn", type: "uint256" },
    ],
    outputs: [
      { name: "tokensOut", type: "uint256" },
      { name: "fee", type: "uint256" },
      { name: "spend", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quoteSell",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "ethOut", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "createLaunch",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "basePrice", type: "uint256" },
      { name: "slope", type: "uint256" },
      { name: "buyTaxBps", type: "uint256" },
      { name: "sellTaxBps", type: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "id", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimCreatorFees",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawProtocolFees",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "event",
    name: "Launched",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "basePrice", type: "uint256", indexed: false },
      { name: "slope", type: "uint256", indexed: false },
      { name: "buyTaxBps", type: "uint256", indexed: false },
      { name: "sellTaxBps", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Bought",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "tokensOut", type: "uint256", indexed: false },
      { name: "ethSpent", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Sold",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "tokensIn", type: "uint256", indexed: false },
      { name: "ethOut", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const launchTokenAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type Launch = {
  id: bigint;
  token: `0x${string}`;
  creator: `0x${string}`;
  totalSupply: bigint;
  tokensSold: bigint;
  ethReserve: bigint;
  basePrice: bigint;
  slope: bigint;
  buyTaxBps: bigint;
  sellTaxBps: bigint;
  graduated: boolean;
};

type LaunchStruct = Omit<Launch, "id">;

/** Build a Launch from the tuple returned by `launches(id)`. */
export function toLaunch(
  id: bigint,
  raw: readonly [
    `0x${string}`,
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    boolean,
  ],
): Launch {
  const [
    token,
    creator,
    totalSupply,
    tokensSold,
    ethReserve,
    basePrice,
    slope,
    buyTaxBps,
    sellTaxBps,
    graduated,
  ] = raw;
  return { id, token, creator, totalSupply, tokensSold, ethReserve, basePrice, slope, buyTaxBps, sellTaxBps, graduated };
}

/** Build a Launch from an item of `getAllLaunches()` (1-based ids). */
export function toLaunchFromStruct(index: number, s: LaunchStruct): Launch {
  return { id: BigInt(index + 1), ...s };
}

export function progressBps(l: Launch): number {
  if (l.totalSupply === 0n) return 0;
  return Number((l.tokensSold * 10_000n) / l.totalSupply) / 100;
}

/** Market cap in wei: spot price (per whole token) * whole-token supply. */
export function marketCap(l: Launch): bigint {
  const price = l.basePrice + (l.slope * l.tokensSold) / 10n ** 18n;
  return (price * l.totalSupply) / 10n ** 18n;
}

export function currentPrice(l: Launch): bigint {
  return l.basePrice + (l.slope * l.tokensSold) / 10n ** 18n;
}

export function formatEth(value: bigint, maxFractionDigits = 5): string {
  const n = Number(formatEther(value));
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

/** Format basis points as a percentage, e.g. 100 bps -> "1%". */
export function formatBps(bps: bigint | number): string {
  const n = Number(bps) / 100;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export function formatTokenAmount(value: bigint, maxFractionDigits = 2): string {
  const n = Number(formatUnits(value, 18));
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

export function shortAddress(address?: string, size = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}

/** Deterministic gradient endpoints derived from a token address. */
export function tokenColors(address: string): [string, string] {
  const hex = (address ?? "").toLowerCase().replace("0x", "").padEnd(40, "0");
  const hue = parseInt(hex.slice(0, 6), 16) % 360;
  const offset = 60 + (parseInt(hex.slice(6, 10), 16) % 120);
  const hue2 = (hue + offset) % 360;
  return [`hsl(${hue} 80% 55%)`, `hsl(${hue2} 85% 60%)`];
}
