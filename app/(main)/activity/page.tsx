"use client";

import { ActivityList } from "@/components/activity/activity-list";

export default function ActivityPage() {
    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
                <p className="text-muted-foreground mt-2">
                    Recent activity in your groups.
                </p>
            </div>

            <ActivityList />
        </div>
    );
}