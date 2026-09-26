"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroupStore } from "@/lib/stores/group-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddMemberDialog } from "@/components/groups/add-member-dialog";
import { Crown, LogOut, ShieldAlert, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface GroupMembersTabProps {
  groupId: number;
}

export function GroupMembersTab({ groupId }: GroupMembersTabProps) {
  const router = useRouter();
  const group = useGroupStore((s) => s.groups.find((g) => g.id === groupId));
  const members = useGroupStore((s) => s.members[groupId] ?? []);
  const removeMember = useGroupStore((s) => s.removeMember);
  const isRemovingMember = useGroupStore((s) => s.isRemovingMember);
  const isFetchingGroupData = useGroupStore((s) => s.isFetchingGroupData);
  const currentUser = useAuthStore((s) => s.user);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    memberId: string;
    memberName: string;
    isSelf: boolean;
  }>({
    open: false,
    memberId: "",
    memberName: "",
    isSelf: false,
  });

  const isCurrentUserOwner = Boolean(
    currentUser?.id && group?.ownerId && currentUser.id === group.ownerId
  );

  const handleConfirmAction = async () => {
    const { memberId, isSelf } = confirmDialog;
    try {
      await removeMember(groupId, memberId);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      if (isSelf) {
        toast.success("You have left the group");
        router.push("/groups");
      }
    } catch {
      // Error toast already displayed by store
    }
  };

  return (
    <Card className="bg-card border-border text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Group Members
          </CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"} in this group
          </CardDescription>
        </div>
        <AddMemberDialog
          groupId={groupId}
          trigger={
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {isFetchingGroupData && members.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-border/40 animate-pulse bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-lg bg-card/50">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-medium">No members found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Invite people to this group using the Add Member button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {members.map((member) => {
              const isOwner = member.id === group?.ownerId;
              const isSelf = member.id === currentUser?.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-muted/30 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-border">
                      {member.image && (
                        <AvatarImage src={member.image} alt={member.name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm truncate">
                          {member.name}
                        </span>
                        {isSelf && (
                          <span className="text-xs text-muted-foreground font-normal">
                            (You)
                          </span>
                        )}
                        {isOwner ? (
                          <Badge
                            variant="default"
                            className="text-[10px] h-5 px-1.5 gap-1 font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20"
                          >
                            <Crown className="h-3 w-3" />
                            Owner
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 font-normal"
                          >
                            Member
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* If current user is Owner and this member is not the Owner */}
                    {isCurrentUserOwner && !isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 gap-1.5"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            memberId: member.id,
                            memberName: member.name,
                            isSelf: false,
                          })
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}

                    {/* If current user is Member (not Owner) and this row is the current user */}
                    {!isCurrentUserOwner && isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 gap-1.5"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            memberId: member.id,
                            memberName: member.name,
                            isSelf: true,
                          })
                        }
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Leave Group</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {confirmDialog.isSelf ? "Leave Group" : "Remove Member"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {confirmDialog.isSelf ? (
                <>
                  Are you sure you want to leave{" "}
                  <strong className="text-foreground">{group?.name}</strong>?
                  <br />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Note: You can only leave if you have cleared all active debts in this group.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to remove{" "}
                  <strong className="text-foreground">
                    {confirmDialog.memberName}
                  </strong>{" "}
                  from <strong className="text-foreground">{group?.name}</strong>?
                  <br />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Note: Members with outstanding debts or credits cannot be removed until all balances are settled.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={isRemovingMember}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmAction}
              disabled={isRemovingMember}
            >
              {isRemovingMember
                ? "Processing..."
                : confirmDialog.isSelf
                ? "Leave Group"
                : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
