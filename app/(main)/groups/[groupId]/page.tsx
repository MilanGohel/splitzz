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

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  // Select specific parts or use selector
  const expenses = useGroupStore(
    useShallow((state) => state.expenses[groupId] || [])
  );
  const isLoading = useGroupStore((state) => state.isLoading);
  const loggedInUser = useAuthStore((state) => state.user);
  useEffect(() => {
    console.log("GroupPage: fetching group data for", groupId);
    useGroupStore.getState().fetchGroupData(groupId);
  }, [groupId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Group Details
          </h2>
          <p className="text-sm text-muted-foreground">ID: {groupId}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddMemberDialog groupId={groupId} />
          <ExpenseDialog
            groupId={groupId}
            mode="add"
            trigger={<Button>Add Expense</Button>}
          />
        </div>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="bg-surface text-muted-foreground">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settle-up">Settle Up</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <Card className="bg-surface border-border text-white">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No expenses recorded yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {expenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  userId={loggedInUser?.id}
                  groupId={groupId}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="balances" className="mt-4">
          <GroupBalancePage />
        </TabsContent>
        <TabsContent value="settle-up" className="mt-4">
          <SuggestedSettlements groupId={groupId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const GroupBalancePage = memo(function GroupBalancePage() {
  return <GroupBalancesPage />;
});

const ExpenseItem = memo(function ExpenseItem({
  expense,
  userId,
  groupId
}: {
  expense: any,
  userId?: string,
  groupId: string
}) {
  return (
    <Card className="bg-surface border-border text-white">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/20">
            <Receipt className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              {expense.paidBy.name} paid{" "}
              {(expense.totalAmount / 100).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            {expense.paidBy.id === userId ? (
              <>
                <span className="text-gain text-sm">You lent </span>
                <p className="font-bold text-gain text-xl">
                  {(
                    (expense.shares.find(
                      (s: any) => s.userId === userId
                    )?.shareAmount ?? 0) / 100
                  ).toFixed(2)}
                </p>
              </>
            ) : (
              <>
                <span className="text-loss text-sm">You lent </span>
                <p className="font-bold text-loss text-xl">
                  {(
                    (expense.shares.find(
                      (s: any) => s.userId === userId
                    )?.shareAmount ?? 0) / 100
                  ).toFixed(2)}
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(expense.createdAt).toLocaleDateString()}
            </p>
          </div>
          <ExpenseDialog
            groupId={groupId}
            mode="edit"
            expense={expense}
            trigger={<Button variant="ghost">Edit</Button>}
          />
        </div>
      </div>
    </Card>
  );
});
