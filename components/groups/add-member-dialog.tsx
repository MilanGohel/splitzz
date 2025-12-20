"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { useAppStore } from "@/lib/store"

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type AddMemberSchema = z.infer<typeof addMemberSchema>

export function AddMemberDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const addMember = useAppStore.getState().addMember

  const form = useForm<AddMemberSchema>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async (data: AddMemberSchema) => {
    try {
      await addMember(groupId, data.email)
      toast.success("Member added successfully")
      setOpen(false)
      form.reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to add member")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface text-white border-border">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Invite a user to this group by email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" className="bg-background border-border" {...field} />
                  </FormControl>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
