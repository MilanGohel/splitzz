"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function DashboardPage() {
  // Mock data for initial implementation since backend aggregations are not ready
  const summary = {
    totalBalance: 1250.00,
    youOwe: 450.00,
    owedToYou: 1700.00,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-surface border-border text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
            <div className={`text-2xl font-bold ${summary.totalBalance >= 0 ? "text-gain" : "text-loss"}`}>
                {summary.totalBalance >= 0 ? "+" : "-"}${Math.abs(summary.totalBalance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
                Overall net position
            </p>
            </CardContent>
        </Card>
        <Card className="bg-surface border-border text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
            <TrendingDown className="h-4 w-4 text-loss" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-loss">
                ${summary.youOwe.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
                To 3 friends
            </p>
            </CardContent>
        </Card>
        <Card className="bg-surface border-border text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You are owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-gain" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-gain">
                ${summary.owedToYou.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
                From 5 friends
            </p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-surface border-border text-white">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No recent activity.</p>
            </CardContent>
        </Card>
         <Card className="col-span-3 bg-surface border-border text-white">
            <CardHeader>
                <CardTitle>Quick Add</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Future: Quick Expense Add */}
                 <p className="text-sm text-muted-foreground">Select a group to add an expense.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
