import { useMemo } from "react";
import { AgentWalletState, useAgentWalletStore } from "./state";
import { StoreApi, UseBoundStore } from "zustand";
import { CommunityConfig, Config } from "@citizenwallet/sdk";
import { CWAccount } from "@/services/account";
import { JsonRpcProvider } from "ethers";
import {
  addDelegateCalldata,
  setAllowanceCalldata,
  removeDelegateCalldata,
  getTokenAllowance,
  getDelegates,
  ALLOWANCE_MODULE_ADDRESS,
} from "@/services/allowance";

const EURE_ADDRESS = "0x5815E61eF72c9E6107b5c5A05FD121F334f7a7f1";

export class AgentWalletLogic {
  state: AgentWalletState;
  config: Config;
  communityConfig: CommunityConfig;

  constructor(state: AgentWalletState, config: Config) {
    this.state = state;
    this.config = config;
    this.communityConfig = new CommunityConfig(config);
  }

  private getProvider(): JsonRpcProvider {
    return new JsonRpcProvider(this.communityConfig.getRPCUrl());
  }

  async loadAgentStatus(safeAddress: string) {
    try {
      this.state.setLoading(true);
      this.state.setError(null);

      const provider = this.getProvider();
      const delegates = await getDelegates(provider, safeAddress);

      if (delegates.length === 0) {
        this.state.setAgentStatus({
          isAgentConnected: false,
          agentAddress: null,
          allowanceAmount: 0n,
          spentAmount: 0n,
          resetTimeMin: 0,
        });
        this.state.setLoading(false);
        return;
      }

      const agentAddress = delegates[0];
      const allowanceData = await getTokenAllowance(
        provider,
        safeAddress,
        agentAddress,
        EURE_ADDRESS
      );

      this.state.setAgentStatus({
        isAgentConnected: true,
        agentAddress,
        allowanceAmount: allowanceData[0],
        spentAmount: allowanceData[1],
        resetTimeMin: Number(allowanceData[2]),
      });
      this.state.setLoading(false);
    } catch (e) {
      console.error("Error loading agent status:", e);
      this.state.setError("Failed to load agent status");
    }
  }

  async setupAgent(
    account: CWAccount,
    agentAddress: string,
    amount: bigint,
    resetTimeMin: number
  ): Promise<boolean> {
    try {
      this.state.setLoading(true);
      this.state.setError(null);

      const addData = addDelegateCalldata(agentAddress);
      const setData = setAllowanceCalldata(
        agentAddress,
        EURE_ADDRESS,
        amount,
        resetTimeMin,
        0
      );

      // Send addDelegate
      const hash1 = await account.call(ALLOWANCE_MODULE_ADDRESS, addData);
      if (!hash1) throw new Error("Failed to submit addDelegate transaction");

      const success1 = await account.waitForTransactionSuccess(hash1);
      if (!success1) throw new Error("addDelegate transaction failed");

      // Send setAllowance
      const hash2 = await account.call(ALLOWANCE_MODULE_ADDRESS, setData);
      if (!hash2) throw new Error("Failed to submit setAllowance transaction");

      const success2 = await account.waitForTransactionSuccess(hash2);
      if (!success2) throw new Error("setAllowance transaction failed");

      this.state.setAgentStatus({
        isAgentConnected: true,
        agentAddress,
        allowanceAmount: amount,
        spentAmount: 0n,
        resetTimeMin,
      });
      this.state.setLoading(false);

      return true;
    } catch (e) {
      console.error("Error setting up agent:", e);
      this.state.setError("Failed to set up agent");
      return false;
    }
  }

  async revokeAgent(
    account: CWAccount,
    agentAddress: string
  ): Promise<boolean> {
    try {
      this.state.setLoading(true);
      this.state.setError(null);

      const data = removeDelegateCalldata(agentAddress, true);
      const hash = await account.call(ALLOWANCE_MODULE_ADDRESS, data);
      if (!hash) throw new Error("Failed to submit revoke transaction");

      const success = await account.waitForTransactionSuccess(hash);
      if (!success) throw new Error("Revoke transaction failed");

      this.state.setAgentStatus({
        isAgentConnected: false,
        agentAddress: null,
        allowanceAmount: 0n,
        spentAmount: 0n,
        resetTimeMin: 0,
      });
      this.state.setLoading(false);

      return true;
    } catch (e) {
      console.error("Error revoking agent:", e);
      this.state.setError("Failed to revoke agent");
      return false;
    }
  }
}

export const useAgentWallet = (
  config: Config
): [UseBoundStore<StoreApi<AgentWalletState>>, AgentWalletLogic] => {
  const store = useAgentWalletStore;

  const actions = useMemo(
    () => new AgentWalletLogic(store.getState(), config),
    [store, config]
  );

  return [store, actions];
};
