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
import { UserPlus, Copy, Check } from "lucide-react"
import { useGroupStore } from "@/lib/stores/group-store"
import { UserCombobox } from "@/components/common/ComboBox"

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type AddMemberSchema = z.infer<typeof addMemberSchema>

export function AddMemberDialog({
  groupId,
  trigger,
}: {
  groupId: number
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const handleCopyInviteLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/groups/${groupId}`
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Invite link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy invite link")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Invite a user to this group by email or share an invite link.
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

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or share invite link</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleCopyInviteLink}
        >
          {copied ? <Check className="h-4 w-4 text-gain" /> : <Copy className="h-4 w-4" />}
          Copy Invite Link
        </Button>
      </DialogContent>
    </Dialog>
  )
}
