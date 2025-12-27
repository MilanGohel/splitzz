import { Activity } from "@/lib/stores/activity-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import {
    Receipt,
    RotateCw,
    Trash2,
    HandCoins,
    UserPlus,
    UserMinus,
    Calculator,
    Plus,
    ArrowRight
} from "lucide-react";

interface ActivityItemProps {
    activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
    const { user: currentUser } = useAuthStore();
    const { type, metadata, createdAt, group, userId, user } = activity;

    const getName = () => {
        if (currentUser?.id === userId) {
            return "You";
        }
        return user?.name || "Unknown user";
    };

    const name = getName();

    const getActivityConfig = () => {
        switch (type) {
            case ACTIVITY_TYPES.EXPENSE_CREATE:
                return {
                    icon: Plus,
                    iconColor: "text-green-500",
                    bgColor: "bg-green-500/10",
                    title: "Expense Added",
                    description: `${name} added "${metadata.expenseDescription}" in "${group.name}"`,
                    amount: metadata.amount,
                    currency: metadata.currency
                };
            case ACTIVITY_TYPES.EXPENSE_UPDATE:
                return {
                    icon: RotateCw,
                    iconColor: "text-blue-500",
                    bgColor: "bg-blue-500/10",
                    title: "Expense Updated",
                    description: `${name} updated "${metadata.description}" in "${group.name}"`,
                    amount: metadata.amount,
                    currency: metadata.currency
                };
            case ACTIVITY_TYPES.EXPENSE_DELETE:
                return {
                    icon: Trash2,
                    iconColor: "text-red-500",
                    bgColor: "bg-red-500/10",
                    title: "Expense Deleted",
                    description: `${name} deleted "${metadata.description}" from "${group.name}"`,
                    amount: metadata.amount,
                    currency: metadata.currency
                };
            case ACTIVITY_TYPES.SETTLEMENT_CREATE:
                return {
                    icon: HandCoins,
                    iconColor: "text-emerald-600",
                    bgColor: "bg-emerald-600/10",
                    title: "Settlement Recorded",
                    description: `${name} recorded a payment in "${group.name}"`,
                    amount: metadata.amount,
                    currency: metadata.currency
                };
            case ACTIVITY_TYPES.GROUP_JOIN:
                return {
                    icon: UserPlus,
                    iconColor: "text-indigo-500",
                    bgColor: "bg-indigo-500/10",
                    title: "Joined Group",
                    description: `${name} added ${metadata.name} to the group "${group.name}"`,
                };
            case ACTIVITY_TYPES.GROUP_LEAVE:
                return {
                    icon: UserMinus,
                    iconColor: "text-orange-500",
                    bgColor: "bg-orange-500/10",
                    title: "Left Group",
                    description: `${name} left the group "${group.name}"`,
                };
            case ACTIVITY_TYPES.SIMPLIFY_DEBTS:
                return {
                    icon: Calculator,
                    iconColor: "text-purple-500",
                    bgColor: "bg-purple-500/10",
                    title: "Debts Simplified",
                    description: `${name} simplified debts in "${group.name}"`,
                };
            case ACTIVITY_TYPES.GROUP_CREATE:
                return {
                    icon: Plus,
                    iconColor: "text-primary",
                    bgColor: "bg-primary/10",
                    title: "Group Created",
                    description: `${name} created the group "${group.name}"`,
                };
            default:
                return {
                    icon: Receipt,
                    iconColor: "text-gray-500",
                    bgColor: "bg-gray-500/10",
                    title: "Activity",
                    description: "New activity recorded",
                };
        }
    };

    const config = getActivityConfig();
    const Icon = config.icon;

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString();
    };

    return (
        <Card className="p-4 hover:bg-accent/5 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-full", config.bgColor)}>
                    <Icon className={cn("w-5 h-5", config.iconColor)} />
                </div>

                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-foreground">{config.title}</h4>
                        <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {config.description}
                    </p>

                    {config.amount !== undefined && (
                        <div className="mt-2 text-sm font-medium">
                            {config.currency} {config.amount.toFixed(2)}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
