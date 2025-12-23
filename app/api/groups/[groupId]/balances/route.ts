import { db, group } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  const { groupId } = await params;

  // 1. Validate Group Existence
  const [groupData] = await db
    .select()
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);
  if (!groupData) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  // 2. Calculate Net Balances
  // Logic: (Money Out) - (Money In/Consumed)
  // (Total Paid + Settlements Sent) - (My Share + Settlements Received)
  const balances = await db.execute(sql`
    SELECT 
      gm.user_id, 
      u.name,
      u.image,
      (
        -- 1. Expenses PAID by user (Money Out -> Credit)
        COALESCE((
          SELECT SUM(ex.total_amount)
          FROM expenses ex
          WHERE ex.group_id = ${groupId} AND ex.paid_by = gm.user_id
        ), 0)
        
        + -- PLUS
        
        -- 2. Settlements SENT by user (Money Out -> Reduces Debt)
        COALESCE((
          SELECT SUM(s.amount)
          FROM settlements s
          WHERE s.group_id = ${groupId} AND s.from_user_id = gm.user_id
        ), 0)

        - -- MINUS

        -- 3. User's SHARE of expenses (Money Consumed -> Debit)
        COALESCE((
          SELECT SUM(es.share_amount)
          FROM expense_shares es
          JOIN expenses ex ON es.expense_id = ex.id  -- JOIN required to filter by Group
          WHERE ex.group_id = ${groupId} AND es.user_id = gm.user_id
        ), 0)

        - -- MINUS

        -- 4. Settlements RECEIVED by user (Money In -> Reduces Credit)
        COALESCE((
          SELECT SUM(s.amount)
          FROM settlements s
          WHERE s.group_id = ${groupId} AND s.to_user_id = gm.user_id
        ), 0)

      ) AS net_balance
    FROM group_members gm
    JOIN "user" u ON gm.user_id = u.id
    WHERE gm.group_id = ${groupId}
    ORDER BY net_balance DESC
  `);

  const formattedBalances = balances.rows.map((row: any) => ({
    userId: row.user_id,
    name: row.name,
    image: row.image,
    amount: Number(row.net_balance), // Amount in Cents
    currency: "INR",
  }));

  return Response.json({ balances: formattedBalances });
}
