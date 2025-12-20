/**
 * Group Schema Validation Tests
 * 
 * Tests for lib/zod/group.ts - groupInsertSchema
 * Validates group creation input according to business rules:
 * - Name: 3-50 characters required
 * - Description: optional, max 255 characters
 */

import { groupInsertSchema } from '@/lib/zod/group';

describe('groupInsertSchema', () => {
    describe('Valid Inputs', () => {
        it('accepts valid group with name and description', () => {
            const input = { name: 'Trip to Goa', description: 'Beach vacation' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Trip to Goa');
                expect(result.data.description).toBe('Beach vacation');
            }
        });

        it('accepts group with name only (no description)', () => {
            const input = { name: 'Dinner Group' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Dinner Group');
                expect(result.data.description).toBeUndefined();
            }
        });

        it('accepts empty string description', () => {
            const input = { name: 'Weekend Trip', description: '' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts minimum valid name length (3 chars)', () => {
            const input = { name: 'ABC' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts maximum valid name length (50 chars)', () => {
            const input = { name: 'A'.repeat(50) };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts maximum description length (255 chars)', () => {
            const input = { name: 'Trip', description: 'D'.repeat(255) };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });
    });

    describe('Invalid Inputs - Name Validation', () => {
        it('rejects empty name', () => {
            const input = { name: '' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects name too short (2 chars)', () => {
            const input = { name: 'AB' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects name too short (1 char)', () => {
            const input = { name: 'A' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects name too long (51 chars)', () => {
            const input = { name: 'A'.repeat(51) };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects missing name field', () => {
            const input = { description: 'Some description' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects null name', () => {
            const input = { name: null };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects numeric name', () => {
            const input = { name: 12345 };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Invalid Inputs - Description Validation', () => {
        it('rejects description too long (256 chars)', () => {
            const input = { name: 'Valid Name', description: 'D'.repeat(256) };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects numeric description', () => {
            const input = { name: 'Valid Name', description: 12345 };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('handles whitespace-only name', () => {
            const input = { name: '   ' };
            const result = groupInsertSchema.safeParse(input);

            // This depends on schema behavior - whitespace counts as chars
            // Update expectation based on actual schema behavior
            expect(result.success).toBe(true); // 3 spaces = 3 chars
        });

        it('handles unicode characters in name', () => {
            const input = { name: 'गोवा ट्रिप' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('handles special characters in name', () => {
            const input = { name: "Trip's & Events!" };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('handles emoji in name', () => {
            const input = { name: '🏖️ Beach Trip' };
            const result = groupInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });
    });
});
