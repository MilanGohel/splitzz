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
import { SuggestedSettlement, useSettlementStore } from "@/lib/stores/settlement-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Loader2 } from "lucide-react";

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
    const [amount, setAmount] = useState<string>(Math.abs(settlement.amount / 100).toString());
    const { settleDebt, isSettlingDebt } = useSettlementStore();
    const user = useAuthStore((state) => state.user);

    const handleSettle = async () => {
        if (!user) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return;
        }

        const isPayable = settlement.type === "PAYABLE";
        // If PAYABLE: I owe them. From: Me, To: Them.
        // If RECEIVABLE: They owe me. From: Them, To: Me.

        const fromUserId = isPayable ? user.id : settlement.other_user_id;
        const toUserId = isPayable ? settlement.other_user_id : user.id;

        try {
            await settleDebt(groupId, {
                fromUserId,
                toUserId,
                amount: numAmount,
            });
            onClose();
        } catch (error) {
            // Error is handled in the store
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
                <DialogHeader>
                    <DialogTitle>Settle Up</DialogTitle>
                    <DialogDescription>
                        {settlement.type === "PAYABLE"
                            ? `You are paying ${settlement.other_user_name}`
                            : `${settlement.other_user_name} is paying you`}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3 bg-background border-input"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSettlingDebt}>
                        Cancel
                    </Button>
                    <Button onClick={handleSettle} disabled={isSettlingDebt}>
                        {isSettlingDebt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Settle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
