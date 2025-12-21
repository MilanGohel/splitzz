"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
    id: string
    name: string
    email: string
    image?: string | null
}

interface UserComboboxProps {
    onSelect: (user: User) => void
}

export function UserCombobox({ onSelect }: UserComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const [search, setSearch] = React.useState("")
    const [users, setUsers] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        const fetchUsers = async () => {
            if (search.length < 3) {
                setUsers([])
                return
            }

            setLoading(true)
            try {
                const res = await fetch(`/api/users/search?q=${search}`)
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data.users || [])
                }
            } catch (error) {
                console.error("Failed to search users", error)
            } finally {
                setLoading(false)
            }
        }

        const timeout = setTimeout(fetchUsers, 300)
        return () => clearTimeout(timeout)
    }, [search])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? users.find((user) => user.email === value)?.name || value
                        : "Search user by name or email..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-surface text-white border-border" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Type at least 3 chars..."
                        value={search}
                        onValueChange={setSearch}
                        className="h-9"
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && users.length === 0 && search.length >= 3 && (
                            <CommandEmpty>No user found.</CommandEmpty>
                        )}
                        {!loading && users.length === 0 && search.length < 3 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 3 characters to search
                            </div>
                        )}
                        <CommandGroup>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.email}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue === value ? "" : currentValue)
                                        onSelect(user)
                                        setOpen(false)
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.image || ""} />
                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            value === user.email ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
