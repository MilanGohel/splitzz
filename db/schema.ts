import { config } from "dotenv";
import { integer, text, boolean, timestamp, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable } from "drizzle-orm/pg-core";

config({ path: ".env" });

export const db = drizzle(process.env.DATABASE_URL!);

export const user = pgTable("users", {
    id: integer("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
});

export const group = pgTable("groups", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: integer("owner_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
});

export const groupMember = pgTable("group_members", {
    id: integer("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
},
    (t) => ({
        groupMemberUnique: unique().on(t.groupId, t.userId).nullsNotDistinct()
    })
);

export const expense = pgTable("expenses", {
    id: integer("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => group.id, { onDelete: "cascade", onUpdate: "cascade" }),
    totalAmount: integer("total_amount").notNull().default(0),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
});

export const expenseShare = pgTable("expense_shares", {
    id: integer("id").primaryKey(),
    expenseId: integer("expense_id").notNull().references(() => expense.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" }),
    shareAmount: integer("share_amount").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
})