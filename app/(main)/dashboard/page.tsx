"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "sonner";

export default function DashboardPage() {
    const [isFetchingDashboardData, setIsFetchingDashboardData] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        total_spendings: 0,
        total_owed: 0,
        total_owes: 0,
    })
    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const res = await fetch(`/api/dashboard?duration=this_month`);
                if (!res.ok) throw new Error();
                debugger;
                const data = await res.json();
                setDashboardData(data.data);
            } catch {
                toast.error("Error while fetching dashboard data.");
            } finally {
                setIsFetchingDashboardData(false);
            }
        }

        fetchDashboardData();
    }, [])

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-3">
                <DashboardCard
                    title="Total Spendings"
                    icon={<IndianRupee className="h-4 w-4 text-brand" />}
                    amount={dashboardData.total_spendings / 100}
                    type={(dashboardData.total_spendings / 100) >= 0 ? "gain" : "loss"}
                    description="Overall net position"
                    showSign
                />
                <DashboardCard
                    title="You Owe"
                    icon={<TrendingDown className="h-4 w-4 text-loss" />}
                    amount={dashboardData.total_owes / 100}
                    type="loss"
                    description="To 3 friends"
                />
                <DashboardCard
                    title="You are owed"
                    icon={<TrendingUp className="h-4 w-4 text-gain" />}
                    amount={dashboardData.total_owed / 100}
                    type="gain"
                    description="From 5 friends"
                />
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

// Mock data for initial implementation since backend aggregations are not ready
const summary = {
    totalBalance: 1250.00,
    youOwe: 450.00,
    owedToYou: 1700.00,
}

const DashboardCard = memo(function DashboardCard({
    title,
    icon,
    amount,
    type,
    description,
    showSign = false
}: {
    title: string,
    icon: React.ReactNode,
    amount: number,
    type: "gain" | "loss",
    description: string,
    showSign?: boolean
}) {
    return (
        <Card className="bg-surface border-border text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${type === "gain" ? "text-gain" : "text-loss"}`}>
                    {showSign ? (amount >= 0 ? "+" : "-") : ""}₹{Math.abs(amount).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    )
})
