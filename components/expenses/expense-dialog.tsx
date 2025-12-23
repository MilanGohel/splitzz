"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseInsertSchema, ExpenseInsertSchema } from "@/lib/zod/expense";

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

type SplitType = "equal" | "unequal";

function expenseToForm(expense: Expense): ExpenseInsertSchema {
  return {
    description: expense.description,
    totalAmount: expense.totalAmount / 100,
    paidBy: expense.paidBy.id,
    shares: expense.shares.map((s) => ({
      userId: s.userId,
      shareAmount: s.shareAmount / 100,
    })),
  };
}

function equalSplit(total: number, ids: string[]) {
  if (ids.length === 0) return [];

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / ids.length);
  const remainder = cents % ids.length;

  return ids.map((id, i) => ({
    userId: id,
    shareAmount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}

export function ExpenseDialog({
  groupId,
  mode,
  expense,
  trigger,
}: {
  groupId: string;
  mode: "add" | "edit";
  expense?: Expense;
  trigger: React.ReactNode;
}) {
  /* ---------------- store ---------------- */

  const rawMembers = useGroupStore((s) => s.members[groupId]);
  const members: Member[] = rawMembers ?? [];

  const createExpense = useGroupStore((s) => s.createExpense);
  const updateExpense = useGroupStore((s) => s.updateExpense);

  /* ---------------- local state ---------------- */

  const [open, setOpen] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* ---------------- form ---------------- */

  const form = useForm<ExpenseInsertSchema>({
    resolver: zodResolver(expenseInsertSchema),
    defaultValues: {
      description: "",
      totalAmount: 0,
      paidBy: "",
      shares: [],
    },
  });

  const totalAmount = form.watch("totalAmount");
  const shares = form.watch("shares");

  /* ---------------- dialog open sync ---------------- */

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && expense) {
      const values = expenseToForm(expense);
      form.reset(values);
      setSelectedIds(values.shares.map((s) => s.userId));
      setSplitType("unequal");
    } else {
      form.reset();
      setSelectedIds([]);
      setSplitType("equal");
    }
  }, [open]);

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

  /* ---------------- submit ---------------- */

  const onSubmit = async (data: ExpenseInsertSchema) => {
    if (mode === "add") {
      await createExpense(groupId, data);
    } else {
      await updateExpense(groupId, expense!.id, data);
    }
    setOpen(false);
  };

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
            shares: [],
          });
          setSelectedIds([]);
          setSplitType("equal");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Expense" : "Edit Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Description" {...form.register("description")} />

          <Input
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            placeholder="Amount"
            {...form.register("totalAmount", {
              valueAsNumber: true,
              onChange: (e) => {
                const v = e.target.value;
                form.setValue(
                  "totalAmount",
                  v === "" ? 0 : Math.trunc(Number(v))
                );
              },
            })}
          />

          <Select
            value={form.watch("paidBy")}
            onValueChange={(v) => form.setValue("paidBy", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Paid by" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ---------- Split Tabs ---------- */}

          <Tabs
            value={splitType}
            onValueChange={(v) => setSplitType(v as SplitType)}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="unequal">Unequal</TabsTrigger>
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
                  <span>{m.name}</span>
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
                      className="w-24"
                      value={share?.shareAmount ?? ""}
                      onChange={(e) =>
                        updateUnequal(m.id, e.target.valueAsNumber)
                      }
                    />
                  </div>
                );
              })}

              <div
                className={
                  Math.abs(unequalTotal - totalAmount) > 0.01
                    ? "text-red-500"
                    : "text-green-500"
                }
              >
                Total: {unequalTotal.toFixed(2)} / {totalAmount}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                (splitType === "equal" && selectedIds.length === 0) ||
                (splitType === "unequal" &&
                  Math.abs(unequalTotal - totalAmount) > 0.01)
              }
            >
              {mode === "add" ? "Add Expense" : "Update Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
