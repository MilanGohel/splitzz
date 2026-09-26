"use client";

import { useEffect, useState, use, memo } from "react";
import axios from "axios";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { AddMemberDialog } from "@/components/groups/add-member-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  ArrowRightLeft,
  CheckCircle2,
  Users,
  Calendar,
  IndianRupee,
  Download,
  Plus,
  UserPlus,
} from "lucide-react";
import { useGroupStore } from "@/lib/stores/group-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSettlementStore } from "@/lib/stores/settlement-store";
import { Button } from "@/components/ui/button";
import GroupBalancesPage from "@/components/groups/group-balances-page";
import { SuggestedSettlements } from "@/components/groups/suggested-settlements";
import { GroupMembersTab } from "@/components/groups/group-members-tab";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const groupIdInt = parseInt(groupId);

  const {
    groups,
    expenses,
    members,
    isFetchingGroupData,
    toggleSimplifiyDebts,
    fetchGroupData,
    isTogglingSimplifyDebts,
  } = useGroupStore();

  const currentUser = useAuthStore((s) => s.user);
  const { fetchSuggestedSettlements } = useSettlementStore();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchGroupData(groupIdInt);
  }, [groupIdInt, fetchGroupData]);

  const group = groups.find((g) => g.id === groupIdInt);
  const groupMembers = members[groupIdInt] ?? [];
  const memberCount = groupMembers.length;

  const handleSimplifyDebtsChange = async () => {
    if (!group?.id) return;
    await toggleSimplifiyDebts(group.id);
    await fetchSuggestedSettlements(group.id);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const currentExpenses = expenses[groupIdInt];
      let exportItems = currentExpenses?.items ?? [];

      if (currentExpenses && currentExpenses.total > exportItems.length) {
        const res = await axios.get(`/api/groups/${groupIdInt}/expenses`, {
          params: { offset: 0, limit: currentExpenses.total },
        });
        if (res.data?.expenses) {
          exportItems = res.data.expenses;
        }
      }

      if (exportItems.length === 0) {
        toast.info("No expenses to export.");
        return;
      }

      const escapeCsv = (val: any) => {
        const str = String(val ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = exportItems.map((exp) => {
        const date = exp.createdAt
          ? new Date(exp.createdAt).toISOString().split("T")[0]
          : "";
        const desc = exp.description || "";
        const cat = exp.category || "general";
        const paidBy = exp.paidBy?.name || exp.paidBy?.email || "Unknown";
        const total = (exp.totalAmount / 100).toFixed(2);
        const myShare = exp.shares?.find((s: any) => s.userId === currentUser?.id);
        const share = myShare ? (myShare.shareAmount / 100).toFixed(2) : "0.00";

        return [date, desc, cat, paidBy, total, share].map(escapeCsv).join(",");
      });

      const csvContent = [
        "Date,Description,Category,Paid By,Total Amount,Your Share",
        ...rows,
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = `${group?.name || "group"}_expenses.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportItems.length} expenses to CSV`);
    } catch {
      toast.error("Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Group Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div className="space-y-2 flex-1">
          {isFetchingGroupData && !group ? (
            <div className="space-y-2.5">
              <Skeleton className="h-8 w-56 bg-muted" />
              <Skeleton className="h-4 w-72 bg-muted" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Skeleton className="h-6 w-28 bg-muted" />
                <Skeleton className="h-6 w-24 bg-muted" />
                <Skeleton className="h-6 w-32 bg-muted" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {group?.name || "Group Details"}
                </h1>
                {group?.description ? (
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    {group.description}
                  </p>
                ) : null}
              </div>

              {/* Key Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 text-xs bg-card border-border"
                >
                  <IndianRupee className="h-3.5 w-3.5 text-primary" />
                  Total Spent:{" "}
                  <span className="font-semibold text-foreground">
                    {formatMoney(group?.totalSpent ?? 0)}
                  </span>
                </Badge>

                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 text-xs bg-card border-border"
                >
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {memberCount} {memberCount === 1 ? "Member" : "Members"}
                  </span>
                </Badge>

                {group?.createdAt && (
                  <Badge
                    variant="outline"
                    className="gap-1.5 py-1 px-2.5 text-xs bg-card border-border"
                  >
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Created {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="gap-1.5 h-9"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </Button>

          <AddMemberDialog
            groupId={groupIdInt}
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </Button>
            }
          />

          <ExpenseDialog
            groupId={groupIdInt}
            mode="add"
            trigger={
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Tabs and Simplify Debts Setting */}
      <Tabs defaultValue="expenses" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <TabsList className="bg-muted text-muted-foreground w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="expenses" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="balances" className="gap-1.5">
              <ArrowRightLeft className="h-4 w-4" />
              <span>Balances</span>
            </TabsTrigger>
            <TabsTrigger value="settle-up" className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settle Up</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between sm:justify-start space-x-2 bg-card border border-border/60 px-3 py-1.5 rounded-lg shrink-0">
            <Label htmlFor="simplify-debts" className="text-xs sm:text-sm font-medium cursor-pointer">
              Simplify Debts
            </Label>
            <Switch
              id="simplify-debts"
              checked={group?.simplifyDebts ?? false}
              disabled={isTogglingSimplifyDebts || isFetchingGroupData}
              onCheckedChange={handleSimplifyDebtsChange}
            />
          </div>
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
        <TabsContent value="members" className="mt-4">
          <GroupMembersTab groupId={groupIdInt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const GroupBalancePage = memo(function GroupBalancePage() {
  return <GroupBalancesPage />;
});
