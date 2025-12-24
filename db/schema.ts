import { config } from "dotenv";
import { integer, text, boolean, timestamp, unique, index, serial, check, jsonb } from "drizzle-orm/pg-core";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from "@neondatabase/serverless"
import { pgTable } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

config({ path: ".env" });


export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const group = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  simplifyDebts: boolean("simplify_debts").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
});

export const groupMember = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
},
  (t) => [
    unique().on(t.groupId, t.userId).nullsNotDistinct()
  ]
);

export const expense = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
  totalAmount: integer("total_amount").notNull(),
  description: text("description"),
  paidBy: text("paid_by").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
}, (t) => [
  check(
    "amount_positive",
    sql`${t.totalAmount} > 0`
  )
]
);

export const expenseShare = pgTable("expense_shares", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expense.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  shareAmount: integer("share_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
}, (t) => [
  check(
    "amount_positive",
    sql`${t.shareAmount} > 0`
  )
])

export const settlement = pgTable("settlements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
  fromUserId: text("from_user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  toUserId: text("to_user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  check(
    "no_self_settlement",
    sql`${t.fromUserId} <> ${t.toUserId}`
  ),
  check(
    "amount_positive",
    sql`${t.amount} > 0`
  )
]);

export const idempotencyKey = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  responseBody: jsonb("response_body").notNull(),
  responseStatus: integer("response_status").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  ownedGroups: many(group),
  memberships: many(groupMember),
  expenseShares: many(expenseShare),
  settlement: many(settlement, { relationName: "settlementSent" }),
  settlementsReceived: many(settlement, { relationName: "settlementReceived" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  }),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
  owner: one(user, {
    fields: [group.ownerId],
    references: [user.id]
  }),
  members: many(groupMember),
  expenses: many(expense),
  settlements: many(settlement),
}));

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
  group: one(group, {
    fields: [groupMember.groupId],
    references: [group.id]
  }),
  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id]
  }),
}));

export const expenseRelations = relations(expense, ({ one, many }) => ({
  group: one(group, {
    fields: [expense.groupId],
    references: [group.id]
  }),
  shares: many(expenseShare),
  paidBy: one(user, {
    fields: [expense.paidBy],
    references: [user.id]
  })
}));

export const settlementRelations = relations(settlement, ({ one }) => ({
  group: one(group, {
    fields: [settlement.groupId],
    references: [group.id]
  }),
  fromUser: one(user, {
    fields: [settlement.fromUserId],
    references: [user.id],
    relationName: "settlementSent"
  }),
  toUser: one(user, {
    fields: [settlement.toUserId],
    references: [user.id],
    relationName: "settlementReceived"
  }),
}));

export const expenseShareRelations = relations(expenseShare, ({ one }) => ({
  expense: one(expense, {
    fields: [expenseShare.expenseId],
    references: [expense.id]
  }),
  user: one(user, {
    fields: [expenseShare.userId],
    references: [user.id]
  }),
}));

export const activity = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
  type: text("type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
});

export const activityRelations = relations(activity, ({ one }) => ({
  user: one(user, {
    fields: [activity.userId],
    references: [user.id]
  }),
  group: one(group, {
    fields: [activity.groupId],
    references: [group.id]
  })
}))

const schema = {
  user,
  session,
  account,
  verification,
  group,
  groupMember,
  expense,
  expenseShare,
  settlement,
  idempotencyKey,
  userRelations,
  sessionRelations,
  accountRelations,
  groupRelations,
  groupMemberRelations,
  settlementRelations,
  expenseRelations,
  expenseShareRelations,
  activity,
  activityRelations
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
export const db = drizzle({ client: pool, schema });