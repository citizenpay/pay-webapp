import { AgentWalletState } from "./state";

const EURE_DECIMALS = 1_000_000;

export const selectAllowanceEur = (state: AgentWalletState): number =>
  Number(state.allowanceAmount) / EURE_DECIMALS;

export const selectSpentEur = (state: AgentWalletState): number =>
  Number(state.spentAmount) / EURE_DECIMALS;

export const selectRemainingEur = (state: AgentWalletState): number =>
  Number(state.allowanceAmount - state.spentAmount) / EURE_DECIMALS;

export const selectResetPeriodLabel = (state: AgentWalletState): string => {
  switch (state.resetTimeMin) {
    case 0:
      return "None";
    case 1440:
      return "Daily";
    case 10080:
      return "Weekly";
    case 43200:
      return "Monthly";
    default:
      return `${state.resetTimeMin}min`;
  }
};
