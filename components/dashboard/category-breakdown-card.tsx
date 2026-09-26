"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  Film,
  ShoppingBag,
  Plane,
  Tag,
  PieChart,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";

export type CategoryStat = {
  category: string;
  total_amount: number;
  count: number;
};

interface CategoryBreakdownCardProps {
  categories: CategoryStat[];
  totalSpendings: number;
  isLoading: boolean;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "food":
      return <Utensils className="h-4 w-4 text-amber-500" />;
    case "groceries":
      return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
    case "transportation":
      return <Car className="h-4 w-4 text-blue-500" />;
    case "utilities":
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case "entertainment":
      return <Film className="h-4 w-4 text-purple-500" />;
    case "shopping":
      return <ShoppingBag className="h-4 w-4 text-pink-500" />;
    case "travel":
      return <Plane className="h-4 w-4 text-cyan-500" />;
    case "general":
    default:
      return <Tag className="h-4 w-4 text-primary" />;
  }
};

export const CategoryBreakdownCard = memo(function CategoryBreakdownCard({
  categories = [],
  totalSpendings = 0,
  isLoading,
  className = "",
}: CategoryBreakdownCardProps) {
  const filteredCategories = categories.filter((c) => c.total_amount > 0);

  return (
    <Card className={`bg-card border-border text-card-foreground flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Spending by Category
        </CardTitle>
        <CardDescription>
          Your spending breakdown for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-2 w-full bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg bg-card/40 my-2">
            <PieChart className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">No spending recorded</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add expenses to see your category breakdown for this period.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredCategories.map((item) => {
              const percentage =
                totalSpendings > 0
                  ? Math.min(100, Math.round((item.total_amount / totalSpendings) * 100))
                  : 0;

              const formattedCategory =
                item.category.charAt(0).toUpperCase() + item.category.slice(1);

              return (
                <div key={item.category} className="space-y-1.5 p-2 rounded-lg bg-muted/20 border border-border/30">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-muted/60">
                        {getCategoryIcon(item.category)}
                      </div>
                      <span className="font-medium text-foreground">
                        {formattedCategory}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({item.count})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {formatMoney(item.total_amount)}
                      </span>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
