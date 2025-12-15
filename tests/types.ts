/**
 * Shared Types for Splitzz
 * These types are used across all test files and will be used in implementation
 */

// ==================== User Types ====================

export interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    createdAt: Date;
}

export interface GoogleProfile {
    sub: string;
    email: string;
    name: string;
    picture?: string;
}

// ==================== Group Types ====================

export interface Group {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    memberIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGroupInput {
    name: string;
    description?: string;
    ownerId: string;
}

// ==================== Expense Types ====================

export interface Share {
    userId: string;
    shareAmount: number; // in smallest currency unit (paise)
}

export interface Expense {
    id: string;
    groupId: string;
    paidBy: string;
    amount: number; // in smallest currency unit (paise)
    shares: Share[];
    description?: string;
    createdAt: Date;
    idempotencyKey?: string;
}

export interface ExpenseInput {
    paidBy: string;
    amount: number;
    shares: Share[];
    description?: string;
}

// ==================== Balance Types ====================

export interface Balance {
    [userId: string]: number; // Positive = owed money, Negative = owes money
}

// ==================== Settlement Types ====================

export interface Settlement {
    id: string;
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    createdAt: Date;
}

export interface SettlementInput {
    fromUserId: string;
    toUserId: string;
    amount: number;
}

// ==================== Result Types ====================

export type Result<T, E = string> =
    | { success: true; data: T }
    | { success: false; error: E };

export type ValidationResult =
    | { valid: true }
    | { valid: false; errors: string[] };

// ==================== API Types ====================

export interface ApiResponse<T> {
    status: number;
    body: T | { error: string };
}

export interface Session {
    user: {
        id: string;
        email: string;
        name: string;
    };
    expires: string;
}
