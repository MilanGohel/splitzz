"use client";

import { memo, useState, useMemo } from "react";
import { useGroupStore } from "@/lib/stores/group-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Utensils,
  ShoppingBasket,
  Car,
  Zap,
  Film,
  ShoppingBag,
  Plane,
  Trash2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { CATEGORIES } from "@/lib/zod/expense";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

function getCategoryIcon(category?: string) {
  switch (category?.toLowerCase()) {
    case "food":
      return Utensils;
    case "groceries":
      return ShoppingBasket;
    case "transportation":
      return Car;
    case "utilities":
      return Zap;
    case "entertainment":
      return Film;
    case "shopping":
      return ShoppingBag;
    case "travel":
      return Plane;
    default:
      return Receipt;
  }
}

export function ExpenseListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-card border-border text-card-foreground">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36 bg-muted" />
                <Skeleton className="h-3 w-24 bg-muted" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-1 text-right flex flex-col items-end">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="h-5 w-20 bg-muted" />
              </div>
              <Skeleton className="h-8 w-16 rounded-md bg-muted" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ExpenseList({ groupId }: { groupId: number }) {
  const {
    expenses: allExpenses,
    fetchMoreExpenses,
    isFetchingMoreExpenses,
    isFetchingGroupData,
  } = useGroupStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const groupExpenses = allExpenses[groupId];
  const expenses = groupExpenses?.items || [];
  const hasMore = groupExpenses?.hasMore || false;
  const loggedInUser = useAuthStore((state) => state.user);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        expense.description.toLowerCase().includes(q) ||
        expense.paidBy.name.toLowerCase().includes(q) ||
        (expense.category &&
          expense.category.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" ||
        (expense.category &&
          expense.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  if (isFetchingGroupData && !groupExpenses) {
    return <ExpenseListSkeleton />;
  }

  if (expenses.length === 0) {
    return (
      <Card className="bg-card border-border text-card-foreground">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No expenses recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses, payers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-xs sm:text-sm bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-card">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || selectedCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card className="bg-card border-border text-card-foreground">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="font-medium text-foreground">
              No matching expenses found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search query or category filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-3 text-xs"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              userId={loggedInUser?.id}
              groupId={groupId}
            />
          ))}

          {hasMore && !searchQuery && selectedCategory === "all" && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => fetchMoreExpenses(groupId)}
                disabled={isFetchingMoreExpenses}
              >
                {isFetchingMoreExpenses ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ExpenseItem = memo(function ExpenseItem({
  expense,
  userId,
  groupId,
}: {
  expense: any;
  userId?: string;
  groupId: number;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteExpense = useGroupStore((state) => state.deleteExpense);

  const CategoryIcon = getCategoryIcon(expense.category);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(groupId, expense.id);
      setDeleteOpen(false);
    } catch {
      // Error handled in store
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="bg-card border-border text-card-foreground">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/20">
            <CategoryIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              {expense.paidBy.name} paid {(expense.totalAmount / 100).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            {expense.paidBy.id === userId ? (
              (() => {
                const myShareAmount =
                  expense.shares.find((s: any) => s.userId === userId)
                    ?.shareAmount ?? 0;
                const isPaidForSelf = expense.totalAmount === myShareAmount;
                const lentAmount = (expense.totalAmount - myShareAmount) / 100;

                if (isPaidForSelf || lentAmount <= 0) {
                  return (
                    <>
                      <span className="text-muted-foreground text-sm">
                        You paid for yourself
                      </span>
                      <p className="font-bold text-muted-foreground text-xl">
                        {(0).toFixed(2)}
                      </p>
                    </>
                  );
                }

                return (
                  <>
                    <span className="text-gain text-sm">You lent </span>
                    <p className="font-bold text-gain text-xl">
                      {lentAmount.toFixed(2)}
                    </p>
                  </>
                );
              })()
            ) : (
              <>
                {(expense.shares.find((s: any) => s.userId === userId)
                  ?.shareAmount ?? 0) === 0 ? (
                  <span className="text-muted-foreground text-sm">
                    You are not involved
                  </span>
                ) : (
                  <>
                    <span className="text-loss text-sm">You borrowed </span>

                    <p className="font-bold text-loss text-xl">
                      {(
                        (expense.shares.find((s: any) => s.userId === userId)
                          ?.shareAmount ?? 0) / 100
                      ).toFixed(2)}
                    </p>
                  </>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(expense.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ExpenseDialog
              groupId={groupId}
              mode="edit"
              expense={expense}
              trigger={<Button variant="ghost">Edit</Button>}
            />
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete Expense"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Expense</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{expense.description}&quot;? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isDeleting}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Card>
  );
});
