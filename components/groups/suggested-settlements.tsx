"use client";

import { useEffect, useState } from "react";
import { useSettlementStore, SuggestedSettlement } from "@/lib/stores/settlement-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Check, Loader2 } from "lucide-react";
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
    } = useSettlementStore();
    const [selectedSettlement, setSelectedSettlement] = useState<SuggestedSettlement | null>(null);

    const settlements = suggestedSettlements[groupId] || [];

    useEffect(() => {
        fetchSuggestedSettlements(groupId);
    }, [groupId, fetchSuggestedSettlements]);

    if (isFetchingSettlements && settlements.length === 0) {
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
                    <div className="flex items-center justify-between p-4">
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
                                    className={`text-sm ${settlement.type === "PAYABLE"
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
                        <Button
                            variant={settlement.type === "PAYABLE" ? "destructive" : "default"}
                            onClick={() => setSelectedSettlement(settlement)}
                        >
                            Settle Up
                        </Button>
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
