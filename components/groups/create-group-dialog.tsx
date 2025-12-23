"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { groupInsertSchema, type GroupInsertInput } from "@/lib/zod/group"
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
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useGroupStore } from "@/lib/stores/group-store"

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const createGroup = useGroupStore((state) => state.createGroup)
  
  const form = useForm<GroupInsertInput>({
    resolver: zodResolver(groupInsertSchema),
    defaultValues: {
        name: "",
        description: ""
    }
  })

  const onSubmit = async (data: GroupInsertInput) => {
    try {
      await createGroup(data)
      toast.success("Group created successfully")
      setOpen(false)
      form.reset()
      router.refresh() 
    } catch (error) {
      toast.error("Failed to create group")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface text-white border-border">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new group to start splitting expenses with friends.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Name</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="Trip to Goa" 
                        className="bg-background border-border"
                        {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description (Optional)</FormLabel>
                  <FormControl>
                     {/* Handling optional string/null effectively */}
                    <Input 
                        placeholder="Expenses for the weekend trip" 
                        className="bg-background border-border"
                        {...field}
                        value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage className="text-loss" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
