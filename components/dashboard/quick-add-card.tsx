import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useGroupStore } from "@/lib/stores/group-store";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { Plus } from "lucide-react";

export function QuickAddCard() {
    const { groups, fetchGroups, fetchGroupData, isFetchingGroups } = useGroupStore();
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    useEffect(() => {
        if (groups.length === 0 && !isFetchingGroups) {
            fetchGroups();
        }
    }, []);

    const handleGroupSelect = async (groupId: string) => {
        setSelectedGroupId(groupId);
        // Pre-fetch group members so the dialog has them
        // We catch error silently as fetchGroupData might toast on error
        await fetchGroupData(Number(groupId)).catch(() => { });
    };

    return (
        <Card className="col-span-3 bg-card border-border text-card-foreground h-fit">
            <CardHeader>
                <CardTitle>Quick Add Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Select Group
                    </label>
                    <Select value={selectedGroupId} onValueChange={handleGroupSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a group..." />
                        </SelectTrigger>
                        <SelectContent>
                            {groups.map((group) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-2">
                    {selectedGroupId ? (
                        <ExpenseDialog
                            mode="add"
                            groupId={Number(selectedGroupId)}
                            trigger={
                                <Button className="w-full">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Expense
                                </Button>
                            }
                        />
                    ) : (
                        <Button disabled className="w-full">
                            Select a group first
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
