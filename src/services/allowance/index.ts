import { Interface, JsonRpcProvider, Contract } from "ethers";

export const ALLOWANCE_MODULE_ADDRESS =
  "0xCFbFaC74C26F8647cBDb8c5caf80BB5b32E43134";

const ALLOWANCE_MODULE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "delegate", type: "address" },
    ],
    name: "addDelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "delegate", type: "address" },
      { internalType: "bool", name: "removeAllowances", type: "bool" },
    ],
    name: "removeDelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "delegate", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint96", name: "allowanceAmount", type: "uint96" },
      { internalType: "uint16", name: "resetTimeMin", type: "uint16" },
      { internalType: "uint32", name: "resetBaseMin", type: "uint32" },
    ],
    name: "setAllowance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "safe", type: "address" },
      { internalType: "address", name: "delegate", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "getTokenAllowance",
    outputs: [
      { internalType: "uint256[5]", name: "", type: "uint256[5]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "safe", type: "address" },
      { internalType: "uint48", name: "start", type: "uint48" },
      { internalType: "uint8", name: "pageSize", type: "uint8" },
    ],
    name: "getDelegates",
    outputs: [
      { internalType: "address[]", name: "results", type: "address[]" },
      { internalType: "uint48", name: "next", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const iface = new Interface(ALLOWANCE_MODULE_ABI);

/** Encode calldata for addDelegate */
export function addDelegateCalldata(delegate: string): string {
  return iface.encodeFunctionData("addDelegate", [delegate]);
}

/** Encode calldata for setAllowance */
export function setAllowanceCalldata(
  delegate: string,
  token: string,
  amount: bigint,
  resetTimeMin: number,
  resetBaseMin: number
): string {
  return iface.encodeFunctionData("setAllowance", [
    delegate,
    token,
    amount,
    resetTimeMin,
    resetBaseMin,
  ]);
}

/** Encode calldata for removeDelegate */
export function removeDelegateCalldata(
  delegate: string,
  removeAllowances: boolean
): string {
  return iface.encodeFunctionData("removeDelegate", [
    delegate,
    removeAllowances,
  ]);
}

/** Read token allowance: returns [amount, spent, resetTimeMin, lastResetMin, nonce] */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  safe: string,
  delegate: string,
  token: string
): Promise<bigint[]> {
  const contract = new Contract(
    ALLOWANCE_MODULE_ADDRESS,
    ALLOWANCE_MODULE_ABI,
    provider
  );
  const result = await contract.getTokenAllowance(safe, delegate, token);
  return Array.from(result as bigint[]);
}

/** Read delegates list for a Safe */
export async function getDelegates(
  provider: JsonRpcProvider,
  safe: string,
  start = 0,
  pageSize = 10
): Promise<string[]> {
  const contract = new Contract(
    ALLOWANCE_MODULE_ADDRESS,
    ALLOWANCE_MODULE_ABI,
    provider
  );
  const [results] = await contract.getDelegates(safe, start, pageSize);
  return Array.from(results as string[]);
}
