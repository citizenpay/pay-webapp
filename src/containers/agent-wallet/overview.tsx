"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Config } from "@citizenwallet/sdk";
import { useAgentWallet } from "@/state/agentWallet/actions";
import {
  selectAllowanceEur,
  selectSpentEur,
  selectRemainingEur,
  selectResetPeriodLabel,
} from "@/state/agentWallet/selectors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Bot, ArrowLeft, Settings, Loader2 } from "lucide-react";
import { CWAccount } from "@/services/account";

interface Props {
  config: Config;
  accountAddress: string;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export default function AgentWalletOverview({
  config,
  accountAddress,
}: Props) {
  const router = useRouter();
  const [store, actions] = useAgentWallet(config);
  const [revoking, setRevoking] = useState(false);

  const loading = store((s) => s.loading);
  const isConnected = store((s) => s.isAgentConnected);
  const agentAddress = store((s) => s.agentAddress);
  const error = store((s) => s.error);
  const allowanceEur = store(selectAllowanceEur);
  const spentEur = store(selectSpentEur);
  const remainingEur = store(selectRemainingEur);
  const resetPeriodLabel = store(selectResetPeriodLabel);

  useEffect(() => {
    actions.loadAgentStatus(accountAddress);
  }, [actions, accountAddress]);

  const handleRevoke = async () => {
    if (!agentAddress) return;
    setRevoking(true);

    const account = new CWAccount(config, accountAddress);
    const success = await actions.revokeAgent(account, agentAddress);
    setRevoking(false);
    if (success) {
      router.refresh();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Agent Wallet</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            {/* Status card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="font-semibold">Connected</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Agent Address
                  </p>
                  <p className="font-medium mt-1">
                    {agentAddress ? truncateAddress(agentAddress) : ""}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Allowance info */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <InfoRow
                  label="Allowance"
                  value={`€${allowanceEur.toFixed(2)}`}
                />
                <InfoRow label="Spent" value={`€${spentEur.toFixed(2)}`} />
                <InfoRow
                  label="Remaining"
                  value={`€${remainingEur.toFixed(2)}`}
                />
                <InfoRow label="Reset Period" value={resetPeriodLabel} />
              </CardContent>
            </Card>

            {/* Actions */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() =>
                router.push(`/${accountAddress}/agent-wallet/policies`)
              }
            >
              <Settings className="h-4 w-4" />
              Policies
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Revoke Access
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke Agent Access</DialogTitle>
                  <DialogDescription>
                    This will remove the agent&apos;s ability to spend from
                    your wallet. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    {revoking && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Revoke
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center pt-12 space-y-5">
            <Bot className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Agent Connected</h2>
            <p className="text-muted-foreground max-w-sm">
              Connect an AI agent to let it spend from your wallet with
              configurable limits and reset periods.
            </p>
            <Button
              className="w-full max-w-xs"
              onClick={() =>
                router.push(`/${accountAddress}/agent-wallet/connect`)
              }
            >
              Connect Agent
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
