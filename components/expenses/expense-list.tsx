"use client";

import { memo } from "react";
import { useGroupStore } from "@/lib/stores/group-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";

export function ExpenseList({ groupId }: { groupId: number }) {
    const {
        expenses: allExpenses,
        fetchMoreExpenses,
        isFetchingMoreExpenses,
        isFetchingGroupData
    } = useGroupStore();

    const groupExpenses = allExpenses[groupId];
    const expenses = groupExpenses?.items || [];
    const hasMore = groupExpenses?.hasMore || false;
    const loggedInUser = useAuthStore((state) => state.user);

    if (isFetchingGroupData && !groupExpenses) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (expenses.length === 0) {
        return (
            <Card className="bg-card border-border text-card-foreground">
                <CardContent className="flex flex-col items-center justify-center p-8">
                    <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                        No expenses recorded yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            {expenses.map((expense) => (
                <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    userId={loggedInUser?.id}
                    groupId={groupId}
                />
            ))}

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <Button
                        variant="outline"
                        onClick={() => fetchMoreExpenses(groupId)}
                        disabled={isFetchingMoreExpenses}
                    >
                        {isFetchingMoreExpenses ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            "Load More"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

const ExpenseItem = memo(function ExpenseItem({
    expense,
    userId,
    groupId
}: {
    expense: any,
    userId?: string,
    groupId: number
}) {
    return (
        <Card className="bg-card border-border text-card-foreground">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/20">
                        <Receipt className="h-5 w-5 text-primary" />
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

                                {(expense.shares.find(
                                    (s: any) => s.userId === userId
                                )?.shareAmount ?? 0) === 0 ?
                                    <span className="text-muted-foreground text-sm">You are not involved</span>
                                    :
                                    (
                                        <>
                                            <span className="text-loss text-sm">You borrowed </span>

                                            <p className="font-bold text-loss text-xl">
                                                {(
                                                    (expense.shares.find(
                                                        (s: any) => s.userId === userId
                                                    )?.shareAmount ?? 0) / 100
                                                ).toFixed(2)}
                                            </p>
                                        </>
                                    )

                                }
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
