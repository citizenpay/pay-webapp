"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Config } from "@citizenwallet/sdk";
import { isAddress } from "ethers";
import { useAgentWallet } from "@/state/agentWallet/actions";
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

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export default function AgentWalletConnect({
  config,
  accountAddress,
}: Props) {
  const router = useRouter();
  const [store, actions] = useAgentWallet(config);
  const loading = store((s) => s.loading);
  const error = store((s) => s.error);

  const [step, setStep] = useState(0);
  const [agentAddress, setAgentAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [resetPeriod, setResetPeriod] = useState("1440");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (step === 0) {
      const addr = agentAddress.trim();
      if (!addr) {
        setAddressError("Address is required");
        return;
      }
      if (!isAddress(addr)) {
        setAddressError("Invalid Ethereum address");
        return;
      }
      setAddressError(null);
      setStep(1);
    } else if (step === 1) {
      const parsed = parseFloat(amount.trim());
      if (!amount.trim()) {
        setAmountError("Amount is required");
        return;
      }
      if (isNaN(parsed) || parsed <= 0) {
        setAmountError("Enter a valid amount");
        return;
      }
      setAmountError(null);
      setStep(2);
    }
  };

  const handleConfirm = async () => {
    const amountEur = parseFloat(amount.trim());
    const amountUnits = BigInt(Math.round(amountEur * 1e6));
    const resetTimeMin = parseInt(resetPeriod);

    const account = new CWAccount(config, accountAddress);
    const success = await actions.setupAgent(
      account,
      agentAddress.trim(),
      amountUnits,
      resetTimeMin
    );

    if (success) {
      router.push(`/${accountAddress}/agent-wallet`);
    }
  };

  const resetLabel =
    RESET_PERIODS.find((p) => p.value === resetPeriod)?.label ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Connect Agent</h1>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Enter the Ethereum address of the agent you want to connect.
            </p>
            <div className="space-y-2">
              <Label>Agent Address</Label>
              <Input
                placeholder="0x..."
                value={agentAddress}
                onChange={(e) => {
                  setAgentAddress(e.target.value);
                  setAddressError(null);
                }}
              />
              {addressError && (
                <p className="text-sm text-destructive">{addressError}</p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
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
                    setAmountError(null);
                  }}
                />
              </div>
              {amountError && (
                <p className="text-sm text-destructive">{amountError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reset Period</Label>
              <Select value={resetPeriod} onValueChange={setResetPeriod}>
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Confirm</h2>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <ConfirmRow
                  label="Agent Address"
                  value={truncateAddress(agentAddress.trim())}
                />
                <ConfirmRow
                  label="Maximum Allowance"
                  value={`€${parseFloat(amount).toFixed(2)}`}
                />
                <ConfirmRow label="Reset Period" value={resetLabel} />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8">
          {step < 2 ? (
            <Button className="w-full" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mt-4">{error}</p>
        )}
      </div>
    </main>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
