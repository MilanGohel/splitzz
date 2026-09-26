"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { QuickAddCard } from "@/components/dashboard/quick-add-card";
import {
  CategoryBreakdownCard,
  CategoryStat,
} from "@/components/dashboard/category-breakdown-card";

type DurationType = "this_month" | "this_year" | "all_time";

const DURATION_OPTIONS: { label: string; value: DurationType }[] = [
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all_time" },
];

interface DashboardDataState {
  total_spendings: number;
  total_owed: number;
  total_owes: number;
  no_of_people_owing: number;
  no_of_people_owed: number;
  categories: CategoryStat[];
}

export default function DashboardPage() {
  const [duration, setDuration] = useState<DurationType>("this_month");
  const [isFetchingDashboardData, setIsFetchingDashboardData] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardDataState>({
    total_spendings: 0,
    total_owed: 0,
    total_owes: 0,
    no_of_people_owing: 0,
    no_of_people_owed: 0,
    categories: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      setIsFetchingDashboardData(true);
      try {
        const res = await fetch(`/api/dashboard?duration=${duration}`);
        if (!res.ok) throw new Error();

        const data = await res.json();
        setDashboardData({
          total_spendings: data.data.total_spendings ?? 0,
          total_owed: data.data.total_owed ?? 0,
          total_owes: data.data.total_owes ?? 0,
          no_of_people_owing: data.data.no_of_people_owing ?? 0,
          no_of_people_owed: data.data.no_of_people_owed ?? 0,
          categories: data.data.categories ?? [],
        });
      } catch {
        toast.error("Error while fetching dashboard data.");
      } finally {
        setIsFetchingDashboardData(false);
      }
    }

    fetchDashboardData();
  }, [duration]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title and Duration Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview of your expenses, debts, and spendings breakdown
          </p>
        </div>

        {/* Interactive Duration Filter Pills */}
        <div className="flex items-center bg-muted/70 p-1 rounded-lg border border-border/50 self-start sm:self-auto">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                duration === opt.value
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Spendings"
          icon={<IndianRupee className="h-4 w-4 text-primary" />}
          amount={dashboardData.total_spendings / 100}
          type={(dashboardData.total_spendings / 100) >= 0 ? "gain" : "loss"}
          description={
            duration === "this_month"
              ? "Spendings this month"
              : duration === "this_year"
              ? "Spendings this year"
              : "Overall spendings across groups"
          }
          showSign
          isLoading={isFetchingDashboardData}
        />
        <DashboardCard
          title="You Owe"
          icon={<TrendingDown className="h-4 w-4 text-loss" />}
          amount={dashboardData.total_owes / 100}
          type="loss"
          description={`${dashboardData.no_of_people_owed} friends`}
          isLoading={isFetchingDashboardData}
        />
        <DashboardCard
          title="You are owed"
          icon={<TrendingUp className="h-4 w-4 text-gain" />}
          amount={dashboardData.total_owed / 100}
          type="gain"
          description={`From ${dashboardData.no_of_people_owing} friends`}
          isLoading={isFetchingDashboardData}
        />
      </div>

      {/* Spendings by Category Breakdown */}
      <CategoryBreakdownCard
        categories={dashboardData.categories}
        totalSpendings={dashboardData.total_spendings}
        isLoading={isFetchingDashboardData}
      />

      {/* Activity and Quick Add Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RecentActivityCard />
        <QuickAddCard />
      </div>
    </div>
  );
}

const DashboardCard = memo(function DashboardCard({
  title,
  icon,
  amount,
  type,
  description,
  showSign = false,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  amount: number;
  type: "gain" | "loss";
  description: string;
  showSign?: boolean;
  isLoading: boolean;
}) {
  return isLoading ? (
    <Card className="bg-card border-border text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="animate-pulse bg-muted h-6 w-32 rounded" />
      </CardContent>
    </Card>
  ) : (
    <Card className="bg-card border-border text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            type === "gain" ? "text-gain" : "text-loss"
          }`}
        >
          {showSign ? (amount >= 0 ? "+" : "-") : ""}₹
          {Math.abs(amount).toFixed(2)}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
});
