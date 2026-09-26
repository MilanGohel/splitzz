"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  expenseInsertSchema,
  ExpenseInsertSchema,
  ExpenseInsertInput,
  CATEGORIES,
} from "@/lib/zod/expense";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Expense, Member, useGroupStore } from "@/lib/stores/group-store";
import {
  Utensils,
  ShoppingBasket,
  Car,
  Zap,
  Film,
  ShoppingBag,
  Plane,
  Receipt,
  Camera,
  Sparkles,
  Loader2,
} from "lucide-react";

export type SplitType = "equal" | "unequal" | "percentage" | "shares";

export const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  general: Receipt,
  food: Utensils,
  groceries: ShoppingBasket,
  transportation: Car,
  utilities: Zap,
  entertainment: Film,
  shopping: ShoppingBag,
  travel: Plane,
};

export const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  food: "Food",
  groceries: "Groceries",
  transportation: "Transportation",
  utilities: "Utilities",
  entertainment: "Entertainment",
  shopping: "Shopping",
  travel: "Travel",
};

function expenseToForm(expense: Expense): ExpenseInsertSchema {
  return {
    description: expense.description,
    totalAmount: expense.totalAmount / 100,
    paidBy: expense.paidBy.id,
    category: expense.category || "general",
    shares: expense.shares.map((s) => ({
      userId: s.userId,
      shareAmount: s.shareAmount / 100,
    })),
  };
}

function equalSplit(total: number, ids: string[]) {
  if (ids.length === 0 || total <= 0) return [];

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / ids.length);
  const remainder = cents % ids.length;

  return ids.map((id, i) => ({
    userId: id,
    shareAmount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}

function calculatePercentageSplit(
  total: number,
  members: Member[],
  percentages: Record<string, number>
) {
  const activeMembers = members.filter((m) => (percentages[m.id] || 0) > 0);
  if (activeMembers.length === 0 || total <= 0) return [];

  const totalCents = Math.round(total * 100);
  let allocatedCents = 0;

  const sharesWithCents = activeMembers.map((m) => {
    const percent = percentages[m.id] || 0;
    const cents = Math.round(total * (percent / 100) * 100);
    allocatedCents += cents;
    return { userId: m.id, cents };
  });

  const remainder = totalCents - allocatedCents;
  if (remainder > 0) {
    for (let i = 0; i < remainder; i++) {
      sharesWithCents[i % sharesWithCents.length].cents += 1;
    }
  } else if (remainder < 0) {
    for (let i = 0; i < Math.abs(remainder); i++) {
      sharesWithCents[i % sharesWithCents.length].cents -= 1;
    }
  }

  return sharesWithCents.map((s) => ({
    userId: s.userId,
    shareAmount: s.cents / 100,
  }));
}

function calculateSharesSplit(
  total: number,
  members: Member[],
  ratios: Record<string, number>
) {
  const activeMembers = members.filter((m) => (ratios[m.id] ?? 1) > 0);
  const totalWeight = activeMembers.reduce(
    (sum, m) => sum + (ratios[m.id] ?? 1),
    0
  );
  if (totalWeight <= 0 || activeMembers.length === 0 || total <= 0) return [];

  const totalCents = Math.round(total * 100);
  let allocatedCents = 0;

  const sharesWithCents = activeMembers.map((m) => {
    const weight = ratios[m.id] ?? 1;
    const cents = Math.round((totalCents * weight) / totalWeight);
    allocatedCents += cents;
    return { userId: m.id, cents };
  });

  const remainder = totalCents - allocatedCents;
  if (remainder > 0) {
    for (let i = 0; i < remainder; i++) {
      sharesWithCents[i % sharesWithCents.length].cents += 1;
    }
  } else if (remainder < 0) {
    for (let i = 0; i < Math.abs(remainder); i++) {
      sharesWithCents[i % sharesWithCents.length].cents -= 1;
    }
  }

  return sharesWithCents.map((s) => ({
    userId: s.userId,
    shareAmount: s.cents / 100,
  }));
}

export function ExpenseDialog({
  groupId,
  mode,
  expense,
  trigger,
}: {
  groupId: number;
  mode: "add" | "edit";
  expense?: Expense;
  trigger: React.ReactNode;
}) {
  /* ---------------- store ---------------- */

  const rawMembers = useGroupStore((s) => s.members[groupId]);
  const members: Member[] = rawMembers ?? [];

  const { createExpense, updateExpense, isCreatingExpense, isUpdatingExpense } =
    useGroupStore();

  const isLoading = mode === "add" ? isCreatingExpense : isUpdatingExpense;

  /* ---------------- local state ---------------- */

  const [open, setOpen] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [sharesRatio, setSharesRatio] = useState<Record<string, number>>({});
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- form ---------------- */

  const form = useForm<ExpenseInsertInput, any, ExpenseInsertSchema>({
    resolver: zodResolver(expenseInsertSchema),
    defaultValues: {
      description: "",
      totalAmount: 0,
      paidBy: "",
      category: "general",
      shares: [],
    },
  });

  const totalAmount = form.watch("totalAmount");
  const shares = form.watch("shares");

  /* ---------------- receipt upload & scan handler ---------------- */

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await axios.post("/api/receipts/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data?.data || res.data?.receipt || res.data;
      if (parsed) {
        if (parsed.description || parsed.merchant) {
          form.setValue("description", parsed.description || parsed.merchant, {
            shouldValidate: true,
          });
        }
        if (typeof parsed.totalAmount === "number" && parsed.totalAmount > 0) {
          const newTotal = parsed.totalAmount;
          form.setValue("totalAmount", newTotal, {
            shouldValidate: true,
          });

          // Trigger split calculation
          if (splitType === "equal") {
            const idsToUse =
              selectedIds.length > 0 ? selectedIds : members.map((m) => m.id);
            if (selectedIds.length === 0) {
              setSelectedIds(idsToUse);
            }
            form.setValue("shares", equalSplit(newTotal, idsToUse));
          } else if (splitType === "percentage") {
            form.setValue(
              "shares",
              calculatePercentageSplit(newTotal, members, percentages)
            );
          } else if (splitType === "shares") {
            form.setValue(
              "shares",
              calculateSharesSplit(newTotal, members, sharesRatio)
            );
          } else if (splitType === "unequal") {
            const idsToUse = members.map((m) => m.id);
            form.setValue("shares", equalSplit(newTotal, idsToUse));
          }
        }
        if (
          parsed.category &&
          (CATEGORIES as readonly string[]).includes(parsed.category)
        ) {
          form.setValue("category", parsed.category);
        }

        toast.success("Receipt scanned successfully!");
      }
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      toast.error(
        err?.response?.data?.error ||
          "Failed to scan receipt. Please enter details manually."
      );
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* ---------------- dialog open sync ---------------- */

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && expense) {
      const values = expenseToForm(expense);
      form.reset(values);
      setSelectedIds(values.shares.map((s) => s.userId));
      setSplitType("unequal");

      const initPercentages: Record<string, number> = {};
      const initRatios: Record<string, number> = {};
      values.shares.forEach((s) => {
        if (values.totalAmount > 0) {
          initPercentages[s.userId] = parseFloat(
            ((s.shareAmount / values.totalAmount) * 100).toFixed(2)
          );
        }
        initRatios[s.userId] = 1;
      });
      setPercentages(initPercentages);
      setSharesRatio(initRatios);
    } else {
      form.reset({
        description: "",
        totalAmount: 0,
        paidBy: "",
        category: "general",
        shares: [],
      });
      setSelectedIds([]);
      setSplitType("equal");
      setPercentages({});
      const defaultRatios: Record<string, number> = {};
      members.forEach((m) => {
        defaultRatios[m.id] = 1;
      });
      setSharesRatio(defaultRatios);
    }
  }, [open, mode, expense, members, form]);

  /* ---------------- sync shares with split mode ---------------- */

  useEffect(() => {
    if (splitType === "equal") {
      form.setValue("shares", equalSplit(totalAmount, selectedIds));
    } else if (splitType === "percentage") {
      form.setValue(
        "shares",
        calculatePercentageSplit(totalAmount, members, percentages)
      );
    } else if (splitType === "shares") {
      form.setValue(
        "shares",
        calculateSharesSplit(totalAmount, members, sharesRatio)
      );
    }
  }, [
    splitType,
    totalAmount,
    selectedIds,
    percentages,
    sharesRatio,
    members,
    form,
  ]);

  /* ---------------- equal split handler ---------------- */

  const toggleEqualMember = (memberId: string, checked: boolean) => {
    const nextIds = checked
      ? [...selectedIds, memberId]
      : selectedIds.filter((id) => id !== memberId);

    setSelectedIds(nextIds);
    form.setValue("shares", equalSplit(totalAmount, nextIds));
  };

  /* ---------------- unequal split handler ---------------- */

  const updateUnequal = (memberId: string, shareAmount: number) => {
    const next = [...(shares || [])];
    const idx = next.findIndex((s) => s.userId === memberId);

    if (idx >= 0) {
      next[idx] = { userId: memberId, shareAmount };
    } else {
      next.push({ userId: memberId, shareAmount });
    }

    form.setValue(
      "shares",
      next.filter((s) => s.shareAmount > 0)
    );
  };

  const unequalTotal = useMemo(
    () => shares?.reduce((sum, s) => sum + s.shareAmount, 0) ?? 0,
    [shares]
  );

  const totalPercentage = useMemo(() => {
    return members.reduce((sum, m) => sum + (percentages[m.id] || 0), 0);
  }, [members, percentages]);

  const totalSharesCount = useMemo(() => {
    return members.reduce((sum, m) => sum + (sharesRatio[m.id] ?? 1), 0);
  }, [members, sharesRatio]);

  /* ---------------- submit ---------------- */

  const onSubmit = async (data: ExpenseInsertSchema) => {
    let finalShares = data.shares;
    if (splitType === "equal") {
      finalShares = equalSplit(data.totalAmount, selectedIds);
    } else if (splitType === "percentage") {
      finalShares = calculatePercentageSplit(
        data.totalAmount,
        members,
        percentages
      );
    } else if (splitType === "shares") {
      finalShares = calculateSharesSplit(
        data.totalAmount,
        members,
        sharesRatio
      );
    }

    const payload = {
      ...data,
      shares: finalShares,
      category: data.category || "general",
    };

    if (mode === "add") {
      await createExpense(groupId, payload);
    } else {
      await updateExpense(groupId, expense!.id, payload);
    }
    setOpen(false);
  };

  /* ---------------- validation for submit button ---------------- */

  const isSubmitDisabled =
    isLoading ||
    (splitType === "equal" && selectedIds.length === 0) ||
    (splitType === "unequal" && Math.abs(unequalTotal - totalAmount) > 0.01) ||
    (splitType === "percentage" && Math.abs(totalPercentage - 100) > 0.01) ||
    (splitType === "shares" && totalSharesCount <= 0);

  /* ---------------- render ---------------- */

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({
            description: "",
            totalAmount: 0,
            paidBy: "",
            category: "general",
            shares: [],
          });
          setSelectedIds([]);
          setSplitType("equal");
          setPercentages({});
          setSharesRatio({});
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>
              {mode === "add" ? "Add Expense" : "Edit Expense"}
            </DialogTitle>
            {mode === "add" && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleReceiptUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs h-8 border-dashed hover:border-primary"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Scanning receipt with AI...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      <Sparkles className="h-3 w-3 text-amber-500 -ml-1" />
                      <span>Scan Receipt</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isScanning && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Scanning receipt with AI... extracting merchant, amount, category & split.</span>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Description" {...form.register("description")} />

          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="Amount"
            {...form.register("totalAmount", {
              valueAsNumber: true,
              onChange: (e) => {
                const v = e.target.value;
                form.setValue("totalAmount", v === "" ? 0 : Number(v));
              },
            })}
          />

          <Select
            value={form.watch("paidBy")}
            onValueChange={(v) => form.setValue("paidBy", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Paid by" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {`(${m.email})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ---------- Category Selector ---------- */}
          <Select
            value={form.watch("category") || "general"}
            onValueChange={(v) => form.setValue("category", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat] || Receipt;
                return (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{CATEGORY_LABELS[cat] || cat}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* ---------- Split Tabs ---------- */}

          <Tabs
            value={splitType}
            onValueChange={(v) => setSplitType(v as SplitType)}
          >
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="unequal">Unequal</TabsTrigger>
              <TabsTrigger value="percentage">By %</TabsTrigger>
              <TabsTrigger value="shares">By Shares</TabsTrigger>
            </TabsList>

            <TabsContent value="equal" className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.includes(m.id)}
                    onCheckedChange={(c) =>
                      toggleEqualMember(m.id, c as boolean)
                    }
                  />
                  <span>
                    {m.name} {`(${m.email})`}
                  </span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="unequal" className="space-y-2">
              {members.map((m) => {
                const share = shares?.find((s) => s.userId === m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{m.name}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="w-24"
                      value={share?.shareAmount ?? ""}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateUnequal(m.id, e.target.valueAsNumber || 0)
                      }
                    />
                  </div>
                );
              })}

              <div
                className={
                  Math.abs(unequalTotal - totalAmount) > 0.01
                    ? "text-red-500 font-medium"
                    : "text-green-500 font-medium"
                }
              >
                Total: {unequalTotal.toFixed(2)} / {totalAmount}
              </div>
            </TabsContent>

            <TabsContent value="percentage" className="space-y-2">
              {members.map((m) => {
                const p = percentages[m.id];
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{m.name}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        max={100}
                        className="w-24"
                        value={p !== undefined && p !== null ? p : ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val =
                            e.target.value === "" ? 0 : Number(e.target.value);
                          setPercentages((prev) => ({
                            ...prev,
                            [m.id]: val,
                          }));
                        }}
                      />
                      <span className="text-muted-foreground w-4">%</span>
                    </div>
                  </div>
                );
              })}

              <div
                className={
                  Math.abs(totalPercentage - 100) > 0.01
                    ? "text-red-500 font-medium"
                    : "text-green-500 font-medium"
                }
              >
                Total: {totalPercentage.toFixed(2)}% / 100%
              </div>
            </TabsContent>

            <TabsContent value="shares" className="space-y-2">
              {members.map((m) => {
                const r = sharesRatio[m.id];
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{m.name}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min={0}
                        className="w-24"
                        value={r !== undefined && r !== null ? r : 1}
                        placeholder="1"
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? 0
                              : Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSharesRatio((prev) => ({
                            ...prev,
                            [m.id]: val,
                          }));
                        }}
                      />
                      <span className="text-muted-foreground text-xs w-12">
                        share(s)
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="text-muted-foreground text-sm font-medium">
                Total Shares: {totalSharesCount}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isLoading
                ? "Saving..."
                : mode === "add"
                  ? "Add Expense"
                  : "Update Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
