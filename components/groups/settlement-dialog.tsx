"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SuggestedSettlement,
  useSettlementStore,
} from "@/lib/stores/settlement-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  Loader2,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: SuggestedSettlement;
  groupId: number;
}

export function SettlementDialog({
  isOpen,
  onClose,
  settlement,
  groupId,
}: SettlementDialogProps) {
  const [amount, setAmount] = useState<string>(
    Math.abs(settlement.amount / 100).toString()
  );
  const [upiId, setUpiId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(true);

  const { settleDebt, isSettlingDebt } = useSettlementStore();
  const user = useAuthStore((state) => state.user);

  const isPayable = settlement.type === "PAYABLE";
  const numAmount = parseFloat(amount) || 0;
  const effectiveUpiId = upiId.trim() || "friend@upi";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent(
    settlement.other_user_name
  )}&am=${numAmount.toFixed(2)}&cu=INR`;

  const handleCopyUpiLink = async () => {
    try {
      await navigator.clipboard.writeText(upiUrl);
      setCopiedLink(true);
      toast.success("UPI payment link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy UPI payment link");
    }
  };

  const handlePayViaUpi = () => {
    window.location.href = upiUrl;
  };

  const handleSettle = async () => {
    if (!user) return;

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const fromUserId = isPayable ? user.id : settlement.other_user_id;
    const toUserId = isPayable ? settlement.other_user_id : user.id;

    try {
      await settleDebt(groupId, {
        fromUserId,
        toUserId,
        amount: numAmount,
      });
      toast.success("Settlement recorded successfully!");
      onClose();
    } catch {
      // Error handled in store
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>
            {isPayable
              ? `You are paying ${settlement.other_user_name}`
              : `${settlement.other_user_name} is paying you`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="amount"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              Settlement Amount (₹)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background border-input font-medium text-base"
              placeholder="0.00"
            />
          </div>

          {/* UPI Payment Deep Link & QR Section (for PAYABLE) */}
          {isPayable && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Pay via UPI Deep Link</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQr(!showQr)}
                  className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{showQr ? "Hide QR" : "Show QR"}</span>
                </Button>
              </div>

              {/* UPI ID input */}
              <div className="space-y-1">
                <Label htmlFor="upiId" className="text-xs text-muted-foreground">
                  Receiver UPI ID (Optional)
                </Label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="friend@upi (e.g. mobile@okaxis, name@paytm)"
                  className="bg-background border-input text-xs h-8"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handlePayViaUpi}
                  className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-9"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Pay via UPI App</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyUpiLink}
                  className="sm:w-auto gap-1.5 h-9 text-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy UPI Link</span>
                    </>
                  )}
                </Button>
              </div>

              {/* QR Preview & formatted URI for Desktop / In-person */}
              {showQr && (
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/90 border border-border/60 text-center gap-2">
                  <div className="p-2 bg-white rounded-lg shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        upiUrl
                      )}`}
                      alt="UPI Payment QR Code"
                      width={150}
                      height={150}
                      className="rounded"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">Scan with any UPI App</p>
                    <p className="text-[11px] text-muted-foreground">
                      Google Pay, PhonePe, Paytm, CRED or BHIM
                    </p>
                  </div>
                  <div className="w-full bg-muted/70 rounded px-2 py-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground gap-2">
                    <span className="truncate">{upiUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpiLink}
                      className="shrink-0 hover:text-foreground p-0.5"
                      title="Copy URI"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSettlingDebt}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSettle}
            disabled={isSettlingDebt || numAmount <= 0}
            className="w-full sm:w-auto"
          >
            {isSettlingDebt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPayable ? "Record as Paid" : "Record as Received"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
