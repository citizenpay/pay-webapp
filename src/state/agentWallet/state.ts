import { create } from "zustand";

export interface AgentWalletState {
  isAgentConnected: boolean;
  agentAddress: string | null;
  allowanceAmount: bigint;
  spentAmount: bigint;
  resetTimeMin: number;
  loading: boolean;
  error: string | null;

  setAgentStatus: (params: {
    isAgentConnected: boolean;
    agentAddress: string | null;
    allowanceAmount: bigint;
    spentAmount: bigint;
    resetTimeMin: number;
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

const initialState = () => ({
  isAgentConnected: false,
  agentAddress: null,
  allowanceAmount: 0n,
  spentAmount: 0n,
  resetTimeMin: 0,
  loading: false,
  error: null,
});

export const useAgentWalletStore = create<AgentWalletState>((set) => ({
  ...initialState(),
  setAgentStatus: (params) => set(() => ({ ...params, error: null })),
  setLoading: (loading) => set(() => ({ loading })),
  setError: (error) => set(() => ({ error, loading: false })),
  clear: () => set(initialState()),
}));
