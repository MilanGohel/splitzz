"use client"

import { useEffect, memo } from "react"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users } from "lucide-react"
import Link from "next/link"
import { useGroupStore } from "@/lib/stores/group-store"

export default function GroupsPage() {
    const { groups, isLoading, fetchGroups } = useGroupStore();

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white">Groups</h2>
                <CreateGroupDialog />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="bg-surface border-border">
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2 bg-muted" />
                                <Skeleton className="h-4 w-3/4 bg-muted" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full bg-muted" />
                            </CardContent>
                        </Card>
                    ))
                ) : groups.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-lg bg-surface/50">
                        <Users className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-white">No groups yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-2">
                            Create a group to start sharing expenses with your friends.
                        </p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))
                )}
            </div>
        </div>
    )
}

const GroupCard = memo(function GroupCard({ group }: { group: any }) {
    return (
        <Link href={`/groups/${group.id}`} className="block transition-transform hover:-translate-y-1">
            <Card className="bg-surface border-border text-white h-full hover:border-brand/50 transition-colors">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {group.name}
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription className="text-muted-foreground line-clamp-1">
                        {group.description || "No description"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        Created on {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
});

