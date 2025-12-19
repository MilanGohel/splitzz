import { db, expense, expenseShare } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expenseId: number }> }
) {
  try {
    const { expenseId } = await params;
    const expenseData = await db
      .select()
      .from(expense)
      .where(eq(expense.id, expenseId))
      .limit(1);

    if (expenseData == null)
      return Response.json(
        {
          error: "Expense not found",
        },
        { status: 404 }
      );

    const expenseSharesData = await db
      .select()
      .from(expenseShare)
      .where(eq(expenseShare.expenseId, expenseId));

    return Response.json({
      expense: expenseData[0],
      expenseShares: expenseSharesData,
    });
  } catch (error) {
    console.error("Error while fetching expense data");
    return Response.json(
      {
        error: "Error while getting expense data",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ expenseId: number }> }
) {
  try {
    const { expenseId } = await params;

    const result = await db
      .delete(expense)
      .where(eq(expense.id, expenseId))
      .returning();

    if (result.length === 0) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    return Response.json(
      {
        message: "Expense deleted successfully",
        deletedItem: result[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while deleting expense data:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}