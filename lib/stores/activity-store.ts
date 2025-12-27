import { create } from "zustand";
import { ActivityType } from "../zod/activity";
import axios from "axios";
import { toast } from "sonner";


export type Activity = {
    id: string;
    type: ActivityType;
    metadata: any;
    createdAt: Date;
    group: {
        name: string;
    }
    groupId: number;
    userId: string;
    user: {
        name: string;
    }
}

export type ActivityState = {
    activities: {
        items: Activity[];
        hasMore: boolean;
        offset: number;
        total: number;
    }
    isFetchingActivities: boolean;

    fetchActivities: () => Promise<void>;
}

const api = axios.create({
    headers: {
        "Content-Type": "application/json"
    }
});


export const userActivityStore = create<ActivityState>((set, get) => ({
    activities: {
        items: [],
        hasMore: false,
        offset: 0,
        total: 0,
    },
    isFetchingActivities: false,

    fetchActivities: async () => {
        const state = get();
        set({ isFetchingActivities: true })
        try {
            const response = await api.get(`/api/activities`, {
                params: {
                    offset: state.activities.offset,
                    limit: 20
                }
            });
            const { data } = response;
            if (data.activities) {
                set((s) => ({
                    activities: {
                        ...s.activities,
                        items: [...s.activities.items, ...data.activities],
                        hasMore: s.activities.items.length + data.activities.length < data.pagination.total,
                        offset: s.activities.offset + data.activities.length,
                        total: data.pagination.total,
                    }
                }))
            }
        } catch (error) {
            toast.error("Failed to load the Activities")
        } finally {
            set({ isFetchingActivities: false });
        }
    }
}))


