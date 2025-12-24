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
import { useGroupStore } from "@/lib/stores/group-store"
import { UserCombobox } from "@/components/common/ComboBox"

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type AddMemberSchema = z.infer<typeof addMemberSchema>

export function AddMemberDialog({ groupId }: { groupId: number }) {
  const [open, setOpen] = useState(false)
  const { addMember, isAddingMember } = useGroupStore()

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
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
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
                <FormItem className="flex flex-col">
                  <FormLabel>Search User</FormLabel>
                  <UserCombobox
                    onSelect={(user) => {
                      form.setValue("email", user.email)
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Selected:</span>
                    <Input
                      {...field}
                      readOnly
                      placeholder="Selected user email"
                      className="bg-muted text-muted-foreground border-input h-8"
                    />
                  </div>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isAddingMember}>
                {isAddingMember ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
