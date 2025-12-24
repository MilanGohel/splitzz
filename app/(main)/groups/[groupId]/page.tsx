"use client";

import { useEffect, useState, use, memo } from "react";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { AddMemberDialog } from "@/components/groups/add-member-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, ArrowRightLeft, Loader2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useGroupStore } from "@/lib/stores/group-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import GroupBalancesPage from "@/components/groups/group-balances-page";
import { SuggestedSettlements } from "@/components/groups/suggested-settlements";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const groupIdInt = parseInt(groupId);
  // Select specific parts or use selector
  const {
    groups,
    isFetchingGroupData,
    toggleSimplifiyDebts,
    fetchGroupData,
    isTogglingSimplifyDebts
  } = useGroupStore();

  useEffect(() => {
    console.log("GroupPage: fetching group data for", groupIdInt);
    fetchGroupData(groupIdInt);
  }, [groupIdInt]);

  const handleSimplifyDebtsChange = async () => {

    const group = groups.find((g) => g.id === groupIdInt);
    if (!group?.id) return;

    await toggleSimplifiyDebts(group.id);

  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Group Details
          </h2>
          <p className="text-sm text-muted-foreground">ID: {groupId}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddMemberDialog groupId={groupIdInt} />
          <ExpenseDialog
            groupId={groupIdInt}
            mode="add"
            trigger={<Button>Add Expense</Button>}
          />
        </div>
      </div>

      <div className="flex flex-row justify-between">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="bg-muted text-muted-foreground">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="settle-up">Settle Up</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Switch id="simplify-debts"
              checked={groups && groups.find((g) => g.id === groupIdInt)?.simplifyDebts}
              disabled={isTogglingSimplifyDebts || isFetchingGroupData}
              onCheckedChange={handleSimplifyDebtsChange} />
            <Label htmlFor="simplify-debts">Simplify Debts</Label>
          </div>

          <TabsContent value="expenses" className="mt-4">
            <ExpenseList groupId={groupIdInt} />
          </TabsContent>
          <TabsContent value="balances" className="mt-4">
            <GroupBalancePage />
          </TabsContent>
          <TabsContent value="settle-up" className="mt-4">
            <SuggestedSettlements groupId={groupIdInt} />
          </TabsContent>

        </Tabs>
      </div>

    </div>
  );
}

const GroupBalancePage = memo(function GroupBalancePage() {
  return <GroupBalancesPage />;
});
