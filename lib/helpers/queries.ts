import { db } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getUserDebts(userId: string, groupId: number) {
  const result = await db.execute(
    sql`
            SELECT
                transactions.other_user_id,
                u.name,
                u.image,
                SUM(amount) AS transactions.net_balance,
            FROM (
               -- 1. Expenses A paid for others (A lends money) -> Positive
               SELECT es.user_id as other_user_id, es.share_amount as amount 
               FROM expenses ex
               JOIN expense_shares es
               ON ex.id = es.expense_id
               WHERE ex.paid_by = ${userId} AND ex.group_id = ${groupId} AND es.user_id != ${userId}

               UNION ALL
               -- 2. Expenses others paid for A (A borrows money) -> Negative
               SELECT ex.paid_by as other_user_id, -es.share_amount as amount
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
               SELECT from_user_id as other_user_id, -s.amount as amount
               FROM settlements s
               WHERE group_id = ${groupId}
               AND to_user_id = ${userId}
            ) as transactions
            JOIN users u
            ON transactions.other_user_id = u.id
             GROUP BY other_user_id 
             HAVING SUM(amount) <> 0
        `
  );
  const rows = result as unknown as {
    other_user_id: string;
    image: string;
    name: string;
    net_balance: number | string;
  }[];

  return rows.map((row) => ({
    other_user_id: row.other_user_id,
    net_balance: Number(row.net_balance),
    image: row.image,
    name: row.name,
  }));
}

export async function getNetBalances(groupId: number) {
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

  const rows = balances as unknown as {
    user_id: string;
    name: string;
    image: string;
    net_balance: number | string;
  }[];

  return rows.map((row) => ({
    user_id: row.user_id,
    name: row.name,
    image: row.image,
    net_balance: Number(row.net_balance),
  }));
}