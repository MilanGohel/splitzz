import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from "axios";
import { Activity } from "@/lib/stores/activity-store";
import { ActivityItem } from "@/components/activity/activity-item";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function RecentActivityCard() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRecent() {
            try {
                const { data } = await axios.get("/api/activities", {
                    params: { limit: 3 }
                });
                setActivities(data.activities);
            } catch (error) {
                toast.error("Failed to load recent activity");
            } finally {
                setIsLoading(false);
            }
        }
        fetchRecent();
    }, []);

    return (
        <Card className="col-span-4 bg-card border-border text-card-foreground h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link
                    href="/activity"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                    View all
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : activities.length > 0 ? (
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No recent activity.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
