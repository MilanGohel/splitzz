import { useEffect, useRef } from "react";
import { userActivityStore } from "@/lib/stores/activity-store";
import { ActivityItem } from "./activity-item";
import { Loader2 } from "lucide-react";

export function ActivityList() {
    const { activities, fetchActivities, isFetchingActivities } = userActivityStore();
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial fetch if empty
        if (activities.items.length === 0) {
            fetchActivities();
        }
    }, [activities.items.length, fetchActivities]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && activities.hasMore && !isFetchingActivities) {
                    fetchActivities();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [activities.hasMore, isFetchingActivities, fetchActivities]);

    return (
        <div className="space-y-4 pb-8">
            {activities.items.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}

            {isFetchingActivities && (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isFetchingActivities && activities.items.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No activities found
                </div>
            )}

            {/* Invisible target for intersection observer */}
            <div ref={observerTarget} className="h-4 visibility-none" />

            {!activities.hasMore && activities.items.length > 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">
                    No more activities
                </div>
            )}
        </div>
    );
}
