"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { expenseInsertSchema, type ExpenseInsertSchema } from "@/lib/zod/expense"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAppStore, type Member } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

export function AddExpenseDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  // Consumers of data
  const members = useAppStore(useShallow(state => state.members[groupId] || []))
  const createExpense = useAppStore.getState().createExpense

  const form = useForm<ExpenseInsertSchema>({
    resolver: zodResolver(expenseInsertSchema),
    defaultValues: {
      description: "",
      totalAmount: 0,
      paidBy: "",
      shares: []
    }
  })

  // Watch for amount changes to recalculate splits if needed
  const totalAmount = form.watch("totalAmount")

  // No need to fetch members here if the parent page calls fetchGroupData
  // But for safety/standalone usage we could, but let's assume parent fetches or store handles it.
  // Ideally, if members are empty, we might want to trigger a fetch, but let's keep it simple.

  const onSubmit = async (data: ExpenseInsertSchema) => {
    try {
      await createExpense(groupId, data)
      toast.success("Expense added successfully")
      setOpen(false)
      form.reset()
      setSelectedMemberIds([])
      setSplitType("equal")
      router.refresh()
    } catch (error) {
      toast.error("Failed to add expense")
    }
  }

  const updateShares = (ids: string[]) => {
    if (ids.length === 0) {
      form.setValue("shares", [])
      return
    }

    const amount =
      totalAmount > 0
        ? Number((totalAmount / ids.length).toFixed(2))
        : 0

    form.setValue(
      "shares",
      ids.map(id => ({ userId: id, amount }))
    )
  }

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [splitType, setSplitType] = useState("equal")

  // Sync shares when switching to equal mode or updating properties
  useEffect(() => {
    if (splitType === "equal") {
      updateShares(selectedMemberIds)
    }
  }, [totalAmount, splitType]) // Removed selectedMemberIds from dep to avoid loop if updateShares changes it? No, updateShares updates form.
  // Actually, updateShares depends on selectedMemberIds. But if we are in 'equal' mode, we want to update shares if totalAmount changes.
  // If we just switch to 'equal', we want to recalculate based on current selectedMemberIds.

  // Re-implement updateShares to be used by checkbox change as well
  const handleCheckboxChange = (checked: boolean, memberId: string) => {
    const next = checked
      ? [...selectedMemberIds, memberId]
      : selectedMemberIds.filter(id => id !== memberId)

    setSelectedMemberIds(next)
    if (splitType === "equal") {
      updateShares(next)
    }
  }

  // Calculate total shares amount for validation
  const currentShares = form.watch("shares")
  const currentSharesTotal = currentShares?.reduce((acc, curr) => acc + curr.amount, 0) || 0



  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) {
        form.reset();
        setSelectedMemberIds([]);
        setSplitType("equal");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface text-white border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Add a new expense to the group.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Dinner at Burger King" className="bg-background border-border" {...field} />
                  </FormControl>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="bg-background border-border"
                      {...field}
                      value={isNaN(field.value) ? "" : field.value}
                      onChange={e => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface text-white border-border">
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Split Method</FormLabel>
              <Tabs defaultValue="equal" onValueChange={setSplitType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted text-muted-foreground p-1">
                  <TabsTrigger value="equal">Equal</TabsTrigger>
                  <TabsTrigger value="unequal">Unequal</TabsTrigger>
                </TabsList>
                <TabsContent value="equal" className="mt-2">
                  <FormLabel className="text-sm font-medium">Split With</FormLabel>
                  <div className="grid gap-2 border rounded-md p-2 border-border mt-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`split-${member.id}`}
                          checked={selectedMemberIds.includes(member.id)} // Keep track of checked state for Equal split
                          onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, member.id)}
                        />
                        <label htmlFor={`split-${member.id}`} className="text-sm font-medium">
                          {member.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="unequal" className="mt-2">
                  <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                    {members.map((member) => {
                      const share = currentShares?.find(s => s.userId === member.id)
                      const amount = share?.amount || 0

                      return (
                        <div key={member.id} className="flex items-center justify-between gap-4">
                          <label htmlFor={`unequal-${member.id}`} className="text-sm font-medium flex-1">
                            {member.name}
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                              id={`unequal-${member.id}`}
                              type="number"
                              placeholder="0.00"
                              value={amount || ""}
                              className="w-24 h-8 bg-background border-border"
                              onChange={(e) => {
                                const val = e.target.valueAsNumber
                                // Update shares directly
                                const newShares = [...(currentShares || [])]
                                const idx = newShares.findIndex(s => s.userId === member.id)
                                if (idx >= 0) {
                                  if (isNaN(val) || val === 0) {
                                    // Remove if 0? Or keep as 0? Logic says sum must match total.
                                    // If we keep 0, it's fine.
                                    newShares[idx] = { userId: member.id, amount: isNaN(val) ? 0 : val }
                                  } else {
                                    newShares[idx] = { userId: member.id, amount: val }
                                  }
                                } else {
                                  if (!isNaN(val) && val > 0) {
                                    newShares.push({ userId: member.id, amount: val })
                                  }
                                }
                                // Handle removal if 0 and strict? No, allow 0.
                                // Actually, filter out 0s on submit or just keep them? Schema says positive().
                                // So 0 is invalid.
                                // But for UI we might need to show 0.
                                // Let's filter out 0s for the form state effectively?
                                // But if I type 1...0 -> 10. If I backspace to 0, it removes?
                                // Better to store 0 in currentShares, but `updateShares` might need to be cleaner.

                                form.setValue("shares", newShares.filter(s => s.amount > 0))
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex justify-end text-sm text-muted-foreground">
                    <span className={Math.abs(currentSharesTotal - totalAmount) > 0.01 ? "text-loss" : "text-gain"}>
                      Total: ${currentSharesTotal.toFixed(2)} / ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </TabsContent>
              </Tabs>

              <FormMessage className="text-loss">
                {form.formState.errors.shares?.message}
              </FormMessage>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || (splitType === 'equal' && selectedMemberIds.length === 0) || (splitType === 'unequal' && Math.abs(currentSharesTotal - totalAmount) > 0.01)}
              >
                Add Expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
