"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Config } from "@citizenwallet/sdk";
import { useAgentWallet } from "@/state/agentWallet/actions";
import {
  selectAllowanceEur,
  selectSpentEur,
  selectRemainingEur,
} from "@/state/agentWallet/selectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CWAccount } from "@/services/account";

interface Props {
  config: Config;
  accountAddress: string;
}

const RESET_PERIODS = [
  { label: "None", value: "0" },
  { label: "Daily", value: "1440" },
  { label: "Weekly", value: "10080" },
  { label: "Monthly", value: "43200" },
] as const;

export default function AgentWalletPolicies({
  config,
  accountAddress,
}: Props) {
  const router = useRouter();
  const [store, actions] = useAgentWallet(config);

  const loading = store((s) => s.loading);
  const agentAddress = store((s) => s.agentAddress);
  const error = store((s) => s.error);
  const storeResetTimeMin = store((s) => s.resetTimeMin);
  const allowanceEur = store(selectAllowanceEur);
  const spentEur = store(selectSpentEur);
  const remainingEur = store(selectRemainingEur);

  const [amount, setAmount] = useState("");
  const [resetPeriod, setResetPeriod] = useState("0");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    actions.loadAgentStatus(accountAddress);
  }, [actions, accountAddress]);

  // Initialize form values from store once loaded
  useEffect(() => {
    if (!initialized && allowanceEur > 0) {
      setAmount(allowanceEur.toFixed(2));
      setResetPeriod(String(storeResetTimeMin));
      setInitialized(true);
    }
  }, [allowanceEur, storeResetTimeMin, initialized]);

  const handleSave = async () => {
    if (!agentAddress) return;

    const amountEur = parseFloat(amount.trim());
    if (isNaN(amountEur) || amountEur <= 0) return;

    const amountUnits = BigInt(Math.round(amountEur * 1e6));
    const resetTimeMin = parseInt(resetPeriod);

    const account = new CWAccount(config, accountAddress);
    const success = await actions.setupAgent(
      account,
      agentAddress,
      amountUnits,
      resetTimeMin
    );

    if (success) {
      router.push(`/${accountAddress}/agent-wallet`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Policies</h1>
        </div>

        {loading && !initialized ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current status */}
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
              </CardContent>
            </Card>

            {/* Edit fields */}
            <div className="space-y-2">
              <Label>Maximum Allowance (EUR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  €
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  className="pl-7"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reset Period</Label>
              <Select
                value={resetPeriod}
                onValueChange={(v) => {
                  setResetPeriod(v);
                  setHasChanges(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESET_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasChanges && (
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={loading}
              >
                {loading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save
              </Button>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
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
