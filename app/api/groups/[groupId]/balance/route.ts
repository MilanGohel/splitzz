import { db } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  const { groupId } = await params;
  // expected output: [{userId, balance}]
  // net balance = total spending by user - total user share;
  //which eventually becomes
  // net = ( expense paid by user + settlement sent ) - ( shares of user + settlement received )
  const balances = await db.execute(sql`   
        SELECT 
        gm.user_id, 
        u.name,
        u.image,
        FROM (
            -- Expense paid by user
            COALESCE(
                SELECT SUM(ex.total_amount)
                FROM expense ex
                WHERE ex.group_id = ${groupId} AND ex.paid_by = gm.user_id;
            ,0)
            -- Settlement sent
            COALESCE(
                SELECT SUM(s.amount), 
                FROM settlements s
                WHERE s.group_id = ${groupId} AND from_user_id = gm.user_id;
            ,0) 
            -- share of user
            COALESCE(
                SELECT SUM(es.share_amount)
                FROM expense_shares es
                WHERE es.group_id = ${groupId} AND user_id = gm.user_id;
            ,0)
            -- Settlement received
            COALESCE(
                SELECT SUM()
                FROM settlements s
                WHERE s.group_id = ${groupId} ANS to_user_id = gm.user_id;
            ,0)

        ) AS net_balance
        FROM group_members gm
        JOIN users u
        ON gm.user_id = u.id
        WHERE gm.group_id = ${groupId}
    `);

  const formattedBalances = balances.rows.map((row: any) => ({
    userId: row.user_id,
    name: row.name,
    image: row.image,
    amount: Number(row.net_balance),
    currency: "INR",
  }));

  return Response.json({ balances: formattedBalances });
}
