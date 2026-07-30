import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthDialog from './AuthDialog';
import { localAuthClient, __resetLocalAuthForTests } from '@/auth/localAuthClient';

function renderDialog(props: Partial<React.ComponentProps<typeof AuthDialog>> = {}) {
  return render(
    <MemoryRouter>
      <AuthDialog open onOpenChange={() => {}} {...props} />
    </MemoryRouter>,
  );
}

describe('AuthDialog', () => {
  beforeEach(() => {
    __resetLocalAuthForTests();
  });

  afterEach(cleanup);

  it('mounts the sign-up form without crashing', () => {
    renderDialog();
    expect(screen.getByText('Join The Clark Competition')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('opens on the sign-in side when asked, and hides sign-up-only fields', () => {
    renderDialog({ defaultMode: 'signin' });
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
  });

  it('switches between modes in place', () => {
    renderDialog({ defaultMode: 'signup' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Welcome back')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByText('Join The Clark Competition')).toBeInTheDocument();
  });

  it('surfaces a validation error against the offending field', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Zane Wolf' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'zane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /create my account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters');
    expect(localAuthClient.getSession()).toBeNull();
  });

  it('creates the account and reports success to the caller', async () => {
    let open = true;
    let succeeded = false;

    renderDialog({
      onOpenChange: (next) => { open = next; },
      onSuccess: () => { succeeded = true; },
    });

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Zane Wolf' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'zane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'billsmafia24' } });
    fireEvent.click(screen.getByRole('radio', { name: 'BUF' }));
    fireEvent.click(screen.getByRole('button', { name: /create my account/i }));

    await waitFor(() => expect(localAuthClient.getSession()).not.toBeNull());
    expect(localAuthClient.getSession()?.user).toMatchObject({
      displayName: 'Zane Wolf',
      favoriteTeam: 'BUF',
    });
    expect(open).toBe(false);
    expect(succeeded).toBe(true);
  });

  it('toggles password visibility', () => {
    renderDialog();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
