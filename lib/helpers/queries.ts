import { db } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getUserDebts(userId: string, groupId: number) {
  const result = await db.execute(
    sql`
            SELECT
                other_user_id,
                SUM(amount) AS net_balance
            FROM (
               -- 1. Expenses A paid for others (A lends money) -> Positive
               SELECT es.user_id as other_user_id, es.share_amount as amount 
               FROM expenses ex
               JOIN expense_shares es
               ON ex.id = es.expense_id
               WHERE ex.paid_by = ${userId} AND ex.group_id = ${groupId} AND es.user_id != ${userId}

               UNION ALL
               -- 2. Expenses others paid for A (A borrows money) -> Negative
               SELECT ex.user_id as other_user_id, -es.share_amount as amount
               FROM expenses ex
               JOIN expense_shares es
               ON ex.id = es.expense_id
               WHERE ex.paid_by != ${userId} AND ex.group_id = ${groupId} AND es.user_id = ${userId}
               
               UNION ALL
               -- 3. Settlements A sent (A pays back) -> Positive (Increases A's standing)
                SELECT to_user_id as other_user_id, s.amount as amount
                FROM settlements s
                WHERE group_id = ${groupId} 
                AND from_user_id = ${userId}

                UNION ALL

               -- 4. Settlements A received (A gets paid) -> Negative (Reduces debt owed to A)
               SELECT from_user_id as other_user_id, s.amount as amount
               FROM settlements s
               WHERE group_id = ${groupId}
               AND to_user_id = ${userId}
            ) as transactions
             GROUP BY other_user_id 
             HAVING SUM(amount) <> 0
        `
  );
  const rows = result as unknown as {
    other_user_id: string;
    net_balance: number | string;
  }[];

  return rows.map((row) => ({
    other_user_id: row.other_user_id,
    net_balance: Number(row.net_balance),
  }));
}
