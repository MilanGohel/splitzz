"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useGroupStore } from "@/lib/stores/group-store";

export default function GroupBalancesTab() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string);

  const loggedInUser = useAuthStore((state) => state.user);
  const { fetchBalances, isFetchingBalances, balances } = useGroupStore();

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Math.abs(cents) / 100);

  useEffect(() => {
    fetchBalances(groupId);
  }, [groupId]);

  /* ---------------- loading ---------------- */

  if (isFetchingBalances) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader>
              <Skeleton className="h-5 w-1/2 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-3/4 bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  /* ---------------- empty ---------------- */

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-lg bg-card/50">
        <Users className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">No balances yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Add expenses to see balances for group members.
        </p>
      </div>
    );
  }

  /* ---------------- content ---------------- */
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((user) => {
        const isSettled = Math.abs(user.amount) < 1;
        const isOwed = user.amount > 0;

        return (
          <Card
            key={user.userId}
            className="bg-card border-border text-card-foreground hover:border-brand/40 transition-colors"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden text-sm font-semibold">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {user.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="leading-none">{loggedInUser && loggedInUser.id === user.userId ? "You" : user.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSettled ? "Settled up" : isOwed ? "Gets back" : "Owes"}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {isSettled ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Settled</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 font-bold ${isOwed ? "text-gain" : "text-loss"
                    }`}
                >
                  {isOwed ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatMoney(user.amount)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
