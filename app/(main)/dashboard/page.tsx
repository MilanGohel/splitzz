"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "sonner";

export default function DashboardPage() {
    const [isFetchingDashboardData, setIsFetchingDashboardData] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        total_spendings: 0,
        total_owed: 0,
        total_owes: 0,
        no_of_people_owing: 0,
        no_of_people_owed: 0,
    })
    useEffect(() => {
        async function fetchDashboardData() {
            setIsFetchingDashboardData(true);
            try {
                const res = await fetch(`/api/dashboard?duration=this_month`);
                if (!res.ok) throw new Error();

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
                    icon={<IndianRupee className="h-4 w-4 text-primary" />}
                    amount={dashboardData.total_spendings / 100}
                    type={(dashboardData.total_spendings / 100) >= 0 ? "gain" : "loss"}
                    description="Overall spendings across groups"
                    showSign
                    isLoading={isFetchingDashboardData}
                />
                <DashboardCard
                    title="You Owe"
                    icon={<TrendingDown className="h-4 w-4 text-loss" />}
                    amount={dashboardData.total_owes / 100}
                    type="loss"
                    description={`${dashboardData.no_of_people_owing} friends`}
                    isLoading={isFetchingDashboardData}
                />
                <DashboardCard
                    title="You are owed"
                    icon={<TrendingUp className="h-4 w-4 text-gain" />}
                    amount={dashboardData.total_owed / 100}
                    type="gain"
                    description="From 5 friends"
                    isLoading={isFetchingDashboardData}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border text-card-foreground">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No recent activity.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-card border-border text-card-foreground">
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


const DashboardCard = memo(function DashboardCard({
    title,
    icon,
    amount,
    type,
    description,
    showSign = false,
    isLoading
}: {
    title: string,
    icon: React.ReactNode,
    amount: number,
    type: "gain" | "loss",
    description: string,
    showSign?: boolean
    isLoading: boolean
}) {
    return (
        isLoading ? (
            <Card className="bg-card border-border text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </CardHeader>
                <CardContent>
                    <p className="animate-pulse bg-gray-700 h-6 w-32 rounded"></p>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-card border-border text-card-foreground">
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
    )
})
