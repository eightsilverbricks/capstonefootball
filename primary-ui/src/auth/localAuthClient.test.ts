import { describe, it, expect, beforeEach } from 'vitest';
import { localAuthClient, __resetLocalAuthForTests, MIN_PASSWORD_LENGTH } from './localAuthClient';

const validSignUp = {
  email: 'Zane@Example.com',
  password: 'billsmafia24',
  displayName: 'Zane Wolf',
  favoriteTeam: 'BUF',
};

describe('localAuthClient', () => {
  beforeEach(() => {
    __resetLocalAuthForTests();
  });

  describe('signUp', () => {
    it('creates an account and signs the user straight in', async () => {
      const { session, error } = await localAuthClient.signUp(validSignUp);

      expect(error).toBeNull();
      expect(session?.user).toMatchObject({
        displayName: 'Zane Wolf',
        email: 'zane@example.com', // normalized
        handle: 'zanewolf',
        favoriteTeam: 'BUF',
      });
      expect(localAuthClient.getSession()?.user.id).toBe(session?.user.id);
    });

    it('rejects a duplicate email regardless of casing', async () => {
      await localAuthClient.signUp(validSignUp);
      const { session, error } = await localAuthClient.signUp({
        ...validSignUp,
        email: 'ZANE@example.com',
      });

      expect(session).toBeNull();
      expect(error?.field).toBe('email');
    });

    it('rejects a short password', async () => {
      const { error } = await localAuthClient.signUp({ ...validSignUp, password: 'short' });
      expect(error?.field).toBe('password');
      expect(error?.message).toContain(String(MIN_PASSWORD_LENGTH));
    });

    it('rejects a malformed email', async () => {
      const { error } = await localAuthClient.signUp({ ...validSignUp, email: 'not-an-email' });
      expect(error?.field).toBe('email');
    });

    it('rejects a one-character display name', async () => {
      const { error } = await localAuthClient.signUp({ ...validSignUp, displayName: 'Z' });
      expect(error?.field).toBe('displayName');
    });

    it('de-duplicates handles derived from the same name', async () => {
      await localAuthClient.signUp(validSignUp);
      await localAuthClient.signOut();
      const { session } = await localAuthClient.signUp({ ...validSignUp, email: 'other@example.com' });
      expect(session?.user.handle).toBe('zanewolf2');
    });

    it('allows skipping the favorite team', async () => {
      const { session, error } = await localAuthClient.signUp({ ...validSignUp, favoriteTeam: null });
      expect(error).toBeNull();
      expect(session?.user.favoriteTeam).toBeNull();
    });

    it('never writes the password anywhere in storage', async () => {
      await localAuthClient.signUp(validSignUp);
      const dump = JSON.stringify(window.localStorage);
      expect(dump).not.toContain('billsmafia24');
    });
  });

  describe('signIn', () => {
    beforeEach(async () => {
      await localAuthClient.signUp(validSignUp);
      await localAuthClient.signOut();
    });

    it('accepts the right password', async () => {
      const { session, error } = await localAuthClient.signIn({
        email: 'zane@example.com',
        password: 'billsmafia24',
      });
      expect(error).toBeNull();
      expect(session?.user.displayName).toBe('Zane Wolf');
    });

    it('rejects the wrong password', async () => {
      const { session, error } = await localAuthClient.signIn({
        email: 'zane@example.com',
        password: 'wrongpassword',
      });
      expect(session).toBeNull();
      expect(error).not.toBeNull();
      expect(localAuthClient.getSession()).toBeNull();
    });

    it('gives the same error for an unknown email as for a bad password', async () => {
      const unknown = await localAuthClient.signIn({ email: 'nobody@example.com', password: 'whatever1' });
      const wrongPassword = await localAuthClient.signIn({ email: 'zane@example.com', password: 'whatever1' });
      expect(unknown.error?.message).toBe(wrongPassword.error?.message);
    });
  });

  describe('session', () => {
    it('returns a stable object identity between reads', async () => {
      await localAuthClient.signUp(validSignUp);
      expect(localAuthClient.getSession()).toBe(localAuthClient.getSession());
    });

    it('notifies subscribers on sign-in and sign-out', async () => {
      let calls = 0;
      const unsubscribe = localAuthClient.subscribe(() => { calls++; });

      await localAuthClient.signUp(validSignUp);
      expect(calls).toBe(1);

      await localAuthClient.signOut();
      expect(calls).toBe(2);
      expect(localAuthClient.getSession()).toBeNull();

      unsubscribe();
      await localAuthClient.signIn({ email: 'zane@example.com', password: 'billsmafia24' });
      expect(calls).toBe(2);
    });

    it('survives a reload — signing back in finds the stored account', async () => {
      await localAuthClient.signUp(validSignUp);
      await localAuthClient.signOut();
      const { error } = await localAuthClient.signIn({
        email: 'zane@example.com',
        password: 'billsmafia24',
      });
      expect(error).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('patches the profile and the live session together', async () => {
      await localAuthClient.signUp(validSignUp);
      const { session, error } = await localAuthClient.updateProfile({ favoriteTeam: 'SEA' });

      expect(error).toBeNull();
      expect(session?.user.favoriteTeam).toBe('SEA');
      expect(localAuthClient.getSession()?.user.favoriteTeam).toBe('SEA');
      // Untouched fields survive the patch.
      expect(localAuthClient.getSession()?.user.displayName).toBe('Zane Wolf');
    });

    it('persists the patch for the next sign-in', async () => {
      await localAuthClient.signUp(validSignUp);
      await localAuthClient.updateProfile({ displayName: 'Zane W.' });
      await localAuthClient.signOut();

      const { session } = await localAuthClient.signIn({
        email: 'zane@example.com',
        password: 'billsmafia24',
      });
      expect(session?.user.displayName).toBe('Zane W.');
    });

    it('errors when nobody is signed in', async () => {
      const { error } = await localAuthClient.updateProfile({ favoriteTeam: 'SEA' });
      expect(error).not.toBeNull();
    });
  });
});
