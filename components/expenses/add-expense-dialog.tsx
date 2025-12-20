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
      router.refresh()
    } catch (error) {
      toast.error("Failed to add expense")
    }
  }

  const handleSplitEqually = (checkedMemberIds: string[]) => {
    if (totalAmount <= 0) return;
    const shareAmount = Number((totalAmount / checkedMemberIds.length).toFixed(2));
    const shares = checkedMemberIds.map(id => ({ userId: id, amount: shareAmount }));
    form.setValue("shares", shares);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                    <FormLabel>Split With (Equal Split)</FormLabel>
                    <div className="grid gap-2 border rounded-md p-2 border-border">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`split-${member.id}`}
                                    onCheckedChange={(checked) => {
                                        const currentShares = form.getValues("shares") || [];
                                        const currentIds = currentShares.map(s => s.userId);
                                        let newIds = []
                                        if (checked) {
                                            newIds = [...currentIds, member.id];
                                        } else {
                                            newIds = currentIds.filter(id => id !== member.id);
                                        }
                                        handleSplitEqually(newIds);
                                    }}
                                />
                                <label htmlFor={`split-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {member.name}
                                </label>
                            </div>
                        ))}
                    </div>
                     <FormMessage className="text-loss">
                        {form.formState.errors.shares?.message}
                    </FormMessage>
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Add Expense</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
