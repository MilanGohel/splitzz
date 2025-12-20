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
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAppStore, type Member, type Expense } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

export function EditExpenseDialog({ groupId, expense }: { groupId: string; expense: Expense }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    // Consumers of data
    const members = useAppStore(useShallow(state => state.members[groupId] || []))
    const updateExpense = useAppStore.getState().updateExpense

    const form = useForm<ExpenseInsertSchema>({
        resolver: zodResolver(expenseInsertSchema),
        defaultValues: {
            description: expense.description,
            totalAmount: expense.totalAmount / 100, // Convert from cents
            paidBy: expense.paidBy.id,
            shares: []
        }
    })

    // Fetch full expense details including shares when dialog opens
    useEffect(() => {
        if (open) {
            fetch(`/api/expenses/${expense.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.expense && data.expenseShares) {
                        form.setValue("shares", data.expenseShares.map((s: any) => ({
                            userId: s.userId,
                            amount: s.shareAmount / 100 // Convert from cents if coming as cents, but API apparently returns divided?
                            // Wait, in `app/api/expenses/[expenseId]/route.ts`:
                            // `expenseShares: expenseSharesData.map((esd) => { return { ...esd, shareAmount: esd.shareAmount / 100 } }),`
                            // So it is already divided.
                        })))
                    }
                })
                .catch(err => console.error("Failed to fetch expense details", err))
        }
    }, [open, expense.id, form])

    // Watch for amount changes to recalculate splits if needed
    const totalAmount = form.watch("totalAmount")

    const onSubmit = async (data: ExpenseInsertSchema) => {
        try {
            await updateExpense(groupId, expense.id, data)
            toast.success("Expense updated successfully")
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error("Failed to update expense")
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface text-white border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                    <DialogDescription>Modify expense details.</DialogDescription>
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
                                            id={`split-edit-${member.id}`}
                                            checked={form.watch("shares")?.some(s => s.userId === member.id)}
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
                                        <label htmlFor={`split-edit-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                            <Button type="submit" disabled={form.formState.isSubmitting}>Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
