"use client"

import { useEffect, useState, use } from "react"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog"
import { AddMemberDialog } from "@/components/groups/add-member-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Receipt, ArrowRightLeft } from "lucide-react"
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from "@/lib/store"

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  // Select specific parts or use selector
  const expenses = useAppStore(useShallow(state => state.expenses[groupId] || []))
  
  useEffect(() => {
    console.log("GroupPage: fetching group data for", groupId)
    useAppStore.getState().fetchGroupData(groupId)
  }, [groupId])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Group Details</h2>
            <p className="text-sm text-muted-foreground">ID: {groupId}</p>
        </div>
        <div className="flex items-center gap-2">
            <AddMemberDialog groupId={groupId} />
            <AddExpenseDialog groupId={groupId} />
        </div>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="bg-surface text-muted-foreground">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-4">
             {expenses.length === 0 ? (
                 <Card className="bg-surface border-border text-white">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No expenses recorded yet.</p>
                    </CardContent>
                 </Card>
             ) : (
                 <div className="grid gap-4">
                     {expenses.map((expense) => (
                         <Card key={expense.id} className="bg-surface border-border text-white">
                             <div className="flex items-center justify-between p-4">
                                 <div className="flex items-center gap-4">
                                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/20">
                                         <Receipt className="h-5 w-5 text-brand" />
                                     </div>
                                     <div>
                                         <p className="font-medium">{expense.description}</p>
                                         <p className="text-xs text-muted-foreground">
                                             Paid by user {expense.paidBy.name}
                                         </p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                     <div className="text-right">
                                         <p className="font-bold text-loss">
                                             ${(expense.totalAmount / 100).toFixed(2)}
                                         </p>
                                         <p className="text-xs text-muted-foreground">
                                             {new Date(expense.createdAt).toLocaleDateString()}
                                         </p>
                                     </div>
                                     <EditExpenseDialog groupId={groupId} expense={expense} />
                                 </div>
                             </div>
                         </Card>
                     ))}
                 </div>
             )}
        </TabsContent>
        <TabsContent value="balances" className="mt-4">
          <Card className="bg-surface border-border text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Settlements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settlements feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
