"use client";

import { useEffect, useState } from "react";
import {
  useGroupStore,
  SuggestedSettlement,
} from "@/lib/stores/group-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettlementDialog } from "./settlement-dialog";

interface SuggestedSettlementsProps {
  groupId: number;
}

export function SuggestedSettlements({ groupId }: SuggestedSettlementsProps) {
  const {
    suggestedSettlements,
    fetchSuggestedSettlements,
    isFetchingSettlements,
    error,
    groups,
  } = useGroupStore();
  const group = groups.find((g) => g.id === groupId);
  const groupName = group?.name || "our group";

  const [selectedSettlement, setSelectedSettlement] =
    useState<SuggestedSettlement | null>(null);

  const settlements = suggestedSettlements[groupId] || [];

  useEffect(() => {
    fetchSuggestedSettlements(groupId);
  }, [groupId, fetchSuggestedSettlements]);

  const handleRemind = async (settlement: SuggestedSettlement) => {
    const formattedAmount = Math.abs(settlement.amount / 100).toFixed(2);
    const message = `Hey ${settlement.other_user_name}, just a friendly reminder to settle ₹${formattedAmount} on Splitzz for ${groupName}!`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }
      toast.success(
        "Reminder copied to clipboard! You can send it on WhatsApp or SMS."
      );
    } catch {
      toast.info(message, { duration: 6000 });
    }
  };

  if (isFetchingSettlements) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border text-card-foreground">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-destructive mb-2">Failed to load settlements</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchSuggestedSettlements(groupId)}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (settlements.length === 0) {
    return (
      <Card className="bg-card border-border text-card-foreground">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Check className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-muted-foreground">You are all settled up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {settlements.map((settlement, index) => (
        <Card key={index} className="bg-card border-border text-card-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={settlement.other_user_image || undefined} />
                <AvatarFallback>
                  {settlement.other_user_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{settlement.other_user_name}</p>
                <p
                  className={`text-sm ${
                    settlement.type === "PAYABLE"
                      ? "text-loss"
                      : "text-gain"
                  }`}
                >
                  {settlement.type === "PAYABLE" ? "you owe" : "owes you"}{" "}
                  <span className="font-bold">
                    ₹{Math.abs(settlement.amount / 100).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {settlement.type === "RECEIVABLE" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemind(settlement)}
                  className="gap-1.5 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  <Bell className="h-4 w-4" />
                  <span>Remind</span>
                </Button>
              )}
              <Button
                variant={settlement.type === "PAYABLE" ? "destructive" : "default"}
                size="sm"
                onClick={() => setSelectedSettlement(settlement)}
              >
                Settle Up
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {selectedSettlement && (
        <SettlementDialog
          isOpen={!!selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          settlement={selectedSettlement}
          groupId={groupId}
        />
      )}
    </div>
  );
}
