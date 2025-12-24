import { activity, db } from "@/db/schema";
import { sql } from "drizzle-orm";

export type DashboardDuration = "this_month" | "this_year" | "all_time";

export async function getUserDashboardData(userId: string, duration: DashboardDuration) {
  const date = new Date();
  let conditionalDate = new Date();
  if (duration === "this_month") {
    conditionalDate = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  else if (duration === "this_year") {
    conditionalDate = new Date(date.getFullYear(), 0, 1);
  }
  else {
    conditionalDate = new Date(1970, 1, 1);
  }
  const totalSpendings = await db.execute(sql`
      SELECT 
      SUM(es.share_amount) as total_spendings
      FROM expense_shares es
      WHERE es.user_id = ${userId}
      AND es.created_at >= ${conditionalDate}
  `);

  const result = await db.execute(sql`
    WITH UserBalances AS (
        SELECT 
            other_user_id,
            SUM(amount) as net_balance
        FROM (
            -- 1. Expenses I paid for others (I lent money) -> Positive (+)
            SELECT es.user_id as other_user_id, es.share_amount as amount 
            FROM expenses ex
            JOIN expense_shares es ON ex.id = es.expense_id 
            WHERE ex.paid_by = ${userId} AND es.user_id != ${userId}
            
            UNION ALL

            -- 2. Expenses others paid for me (I borrowed money) -> Negative (-)
            SELECT ex.paid_by as other_user_id, -es.share_amount as amount
            FROM expenses ex
            JOIN expense_shares es ON ex.id = es.expense_id
            WHERE ex.paid_by != ${userId} AND es.user_id = ${userId}
            
            UNION ALL

            -- 3. Settlements I sent (I paid back) -> Positive (+)
            -- (Increasing my standing with them)
            SELECT to_user_id as other_user_id, amount
            FROM settlements
            WHERE from_user_id = ${userId}

            UNION ALL

            -- 4. Settlements I received (I got paid) -> Negative (-)
            -- (Decreasing what they owe me)
            SELECT from_user_id as other_user_id, -amount
            FROM settlements
            WHERE to_user_id = ${userId}
        ) as all_trans
        GROUP BY other_user_id
    )
    SELECT 
        -- Sum of all positive balances (People owe me)
        COALESCE(SUM(CASE WHEN net_balance > 0 THEN net_balance ELSE 0 END), 0) as total_owed,
        COUNT(CASE WHEN net_balance > 0 THEN 1 END) as no_of_people_owing,
        
        -- Sum of all negative balances (I owe people)
        COALESCE(ABS(SUM(CASE WHEN net_balance < 0 THEN net_balance ELSE 0 END)), 0) as total_owes,
        COUNT(CASE WHEN net_balance < 0 THEN 1 END) as no_of_people_owed
    FROM UserBalances
  `);

  const rows = result.rows as {
    total_owed: number;
    total_owes: number;
    no_of_people_owing: number;
    no_of_people_owed: number;
  }[];

  const totalSpendingsVal = totalSpendings.rows as {
    total_spendings: number;
  }[];

  const row = rows[0] || { total_owed: 0, total_owes: 0 };
  const totalSpending = totalSpendingsVal[0]?.total_spendings || 0;

  return {
    total_owed: Number(row.total_owed),
    total_owes: Number(row.total_owes),
    total_spendings: Number(totalSpending),
    no_of_people_owing: Number(row.no_of_people_owing),
    no_of_people_owed: Number(row.no_of_people_owed),
  };
}

export async function getUserDebts(userId: string, groupId: number) {
  const result = await db.execute(
    sql`
        SELECT 
            transactions.other_user_id,
            u.name,
            u.image,
            SUM(amount) AS net_balance -- Fixed alias
        FROM (
            -- 1. Expenses I paid (I lent money) -> Positive
            SELECT es.user_id as other_user_id, es.share_amount as amount 
            FROM expenses ex
            JOIN expense_shares es ON ex.id = es.expense_id
            WHERE ex.paid_by = ${userId} AND ex.group_id = ${groupId} AND es.user_id != ${userId}

            UNION ALL

            -- 2. Expenses others paid for me (I borrowed) -> Negative
            SELECT ex.paid_by as other_user_id, -es.share_amount as amount
            FROM expenses ex
            JOIN expense_shares es ON ex.id = es.expense_id
            WHERE ex.paid_by != ${userId} AND ex.group_id = ${groupId} AND es.user_id = ${userId}
            
            UNION ALL

            -- 3. Settlements I sent (Debt goes down/Credit goes up) -> Positive
            SELECT to_user_id as other_user_id, s.amount as amount
            FROM settlements s
            WHERE group_id = ${groupId} AND from_user_id = ${userId}

            UNION ALL

            -- 4. Settlements I received (Credit goes down) -> Negative
            SELECT from_user_id as other_user_id, -s.amount as amount
            FROM settlements s
            WHERE group_id = ${groupId} AND to_user_id = ${userId}
        ) as transactions
        JOIN "user" u ON transactions.other_user_id = u.id
        GROUP BY transactions.other_user_id, u.name, u.image
        HAVING SUM(amount) <> 0
    `
  );

  const rows = result.rows as {
    other_user_id: string;
    image: string;
    name: string;
    net_balance: number | string;
  }[];

  return rows.map(row => ({
    other_user_id: row.other_user_id,
    other_user_name: row.name,
    other_user_image: row.image,
    amount: Number(row.net_balance),
    type: Number(row.net_balance) > 0 ? "RECEIVABLE" : "PAYABLE",
  }));
}

export async function getNetBalances(groupId: number) {
  const balances = await db.execute(sql`   
        SELECT 
            gm.user_id as user_id, 
            u.name,
            u.image,
            (
                -- 1. (+) Total amount this user paid for expenses
                COALESCE((
                    SELECT SUM(ex.total_amount)
                    FROM expenses ex
                    WHERE ex.group_id = ${groupId} AND ex.paid_by = gm.user_id
                ), 0)
                +
                -- 2. (+) Total settlements this user SENT (paid back)
                COALESCE((
                    SELECT SUM(s.amount)
                    FROM settlements s
                    WHERE s.group_id = ${groupId} AND s.from_user_id = gm.user_id
                ), 0)
                -
                -- 3. (-) Total value this user CONSUMED (their share)
                COALESCE((
                    SELECT SUM(es.share_amount)
                    FROM expense_shares es
                    JOIN expenses ex ON es.expense_id = ex.id
                    WHERE ex.group_id = ${groupId} AND es.user_id = gm.user_id
                ), 0)
                -
                -- 4. (-) Total settlements this user RECEIVED
                COALESCE((
                    SELECT SUM(s.amount)
                    FROM settlements s
                    WHERE s.group_id = ${groupId} AND s.to_user_id = gm.user_id
                ), 0)
            ) AS net_balance
        FROM group_members gm
        JOIN "user" u ON gm.user_id = u.id
        WHERE gm.group_id = ${groupId}
    `);

  const rows = balances.rows as {
    user_id: string;
    name: string;
    image: string;
    net_balance: number | string;
  }[];

  return rows.map(row => ({
    user_id: row.user_id,
    user_name: row.name,
    user_image: row.image,
    net_balance: Number(row.net_balance),
    type: Number(row.net_balance) > 0 ? "RECEIVABLE" : "PAYABLE",
  }));
}

export async function insertActivity(userId: string, groupId: string, type: string) {
  await db.insert(activity).values({
    userId,
    groupId,
    type,
  });
}