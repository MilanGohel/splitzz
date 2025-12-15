/**
 * Authentication Tests (Google Login)
 * 
 * These tests verify the authentication flow for Google OAuth login.
 * Core invariants:
 * - Email is unique
 * - Re-login does not create duplicate user
 * - User profile is created on first login only
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Types for authentication
interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: Date;
}

interface GoogleProfile {
  sub: string; // Google's unique ID
  email: string;
  name: string;
  picture?: string;
}

// Mock user store (will be replaced by actual Prisma implementation)
let userStore: Map<string, User>;

// Pure function to handle Google sign-in
function handleGoogleSignIn(
  profile: GoogleProfile,
  existingUsers: Map<string, User>
): { user: User; isNewUser: boolean } {
  // Check if user already exists by email
  const existingUser = Array.from(existingUsers.values()).find(
    (u) => u.email === profile.email
  );

  if (existingUser) {
    return { user: existingUser, isNewUser: false };
  }

  // Create new user
  const newUser: User = {
    id: crypto.randomUUID(),
    email: profile.email,
    name: profile.name,
    image: profile.picture,
    createdAt: new Date(),
  };

  return { user: newUser, isNewUser: true };
}

// Pure function to validate email uniqueness
function isEmailUnique(email: string, existingUsers: Map<string, User>): boolean {
  return !Array.from(existingUsers.values()).some((u) => u.email === email);
}

// Pure function to get user count
function getUserCount(users: Map<string, User>): number {
  return users.size;
}

describe('Authentication - Google Login', () => {
  beforeEach(() => {
    userStore = new Map();
  });

  describe('User Creation', () => {
    it('creates user on first Google login', () => {
      const googleProfile: GoogleProfile = {
        sub: 'google-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      };

      const result = handleGoogleSignIn(googleProfile, userStore);

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.image).toBe('https://example.com/avatar.jpg');
      expect(result.user.id).toBeDefined();
      expect(result.user.createdAt).toBeInstanceOf(Date);
    });

    it('does not duplicate user on re-login', () => {
      const googleProfile: GoogleProfile = {
        sub: 'google-123',
        email: 'user@example.com',
        name: 'Test User',
      };

      // First login
      const firstResult = handleGoogleSignIn(googleProfile, userStore);
      userStore.set(firstResult.user.id, firstResult.user);
      const countAfterFirst = getUserCount(userStore);

      // Second login (re-login)
      const secondResult = handleGoogleSignIn(googleProfile, userStore);

      expect(secondResult.isNewUser).toBe(false);
      expect(secondResult.user.id).toBe(firstResult.user.id);
      expect(getUserCount(userStore)).toBe(countAfterFirst);
    });

    it('creates user profile on first login only', () => {
      const googleProfile: GoogleProfile = {
        sub: 'google-456',
        email: 'another@example.com',
        name: 'Another User',
      };

      // First login - should create profile
      const firstResult = handleGoogleSignIn(googleProfile, userStore);
      expect(firstResult.isNewUser).toBe(true);

      // Add to store
      userStore.set(firstResult.user.id, firstResult.user);

      // Subsequent logins - should NOT create new profile
      const secondResult = handleGoogleSignIn(googleProfile, userStore);
      expect(secondResult.isNewUser).toBe(false);

      const thirdResult = handleGoogleSignIn(googleProfile, userStore);
      expect(thirdResult.isNewUser).toBe(false);
    });
  });

  describe('Email Uniqueness', () => {
    it('enforces email uniqueness', () => {
      const user1: User = {
        id: 'user-1',
        email: 'unique@example.com',
        name: 'User 1',
        createdAt: new Date(),
      };
      userStore.set(user1.id, user1);

      expect(isEmailUnique('unique@example.com', userStore)).toBe(false);
      expect(isEmailUnique('different@example.com', userStore)).toBe(true);
    });

    it('treats email comparison as case-sensitive by default', () => {
      const user1: User = {
        id: 'user-1',
        email: 'Test@Example.com',
        name: 'User 1',
        createdAt: new Date(),
      };
      userStore.set(user1.id, user1);

      // Note: In production, you may want case-insensitive email comparison
      expect(isEmailUnique('test@example.com', userStore)).toBe(true);
      expect(isEmailUnique('Test@Example.com', userStore)).toBe(false);
    });
  });

  describe('Multiple Users', () => {
    it('allows different users with different emails', () => {
      const profile1: GoogleProfile = {
        sub: 'google-1',
        email: 'user1@example.com',
        name: 'User 1',
      };

      const profile2: GoogleProfile = {
        sub: 'google-2',
        email: 'user2@example.com',
        name: 'User 2',
      };

      const result1 = handleGoogleSignIn(profile1, userStore);
      userStore.set(result1.user.id, result1.user);

      const result2 = handleGoogleSignIn(profile2, userStore);
      userStore.set(result2.user.id, result2.user);

      expect(result1.isNewUser).toBe(true);
      expect(result2.isNewUser).toBe(true);
      expect(result1.user.id).not.toBe(result2.user.id);
      expect(getUserCount(userStore)).toBe(2);
    });
  });
});
