import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SignInGate, { LockedChip } from './SignInGate';
import { GATE_COPY } from '@/lib/gate';

const auth = vi.hoisted(() => ({ isSignedIn: false }));
const dialog = vi.hoisted(() => ({ openAuthDialog: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isSignedIn: auth.isSignedIn }) }));
vi.mock('@/hooks/useAuthDialog', () => dialog);

const Secret = () => <p>Clark: DAL 64%</p>;

describe('SignInGate', () => {
  beforeEach(() => {
    auth.isSignedIn = false;
    dialog.openAuthDialog.mockClear();
  });

  it('renders the real content for signed-in members', () => {
    auth.isSignedIn = true;
    render(<SignInGate feature="game"><Secret /></SignInGate>);
    expect(screen.getByText('Clark: DAL 64%')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Members only' })).not.toBeInTheDocument();
  });

  it('never renders the real content for signed-out visitors', () => {
    render(<SignInGate feature="game"><Secret /></SignInGate>);
    expect(screen.queryByText('Clark: DAL 64%')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Members only' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GATE_COPY.game.detail.slice(0, 20)))).toBeInTheDocument();
  });

  it('opens sign-up from the wall, not a redirect', () => {
    render(<SignInGate feature="team"><Secret /></SignInGate>);
    fireEvent.click(screen.getByRole('button', { name: 'Create free account' }));
    expect(dialog.openAuthDialog).toHaveBeenCalledWith('signup');
  });

  it('offers sign-in for people who already have an account', () => {
    render(<SignInGate feature="leaderboard"><Secret /></SignInGate>);
    fireEvent.click(screen.getByRole('button', { name: 'I have an account' }));
    expect(dialog.openAuthDialog).toHaveBeenCalledWith('signin');
  });

  it('hides the blurred preview from assistive tech', () => {
    const { container } = render(<SignInGate feature="roster"><Secret /></SignInGate>);
    expect(container.querySelector('.gate-preview')).toHaveAttribute('aria-hidden', 'true');
  });

  it('compact gates show the card without a preview', () => {
    const { container } = render(<SignInGate feature="clark-pick" compact><Secret /></SignInGate>);
    expect(container.querySelector('.gate-preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create free account' })).toBeInTheDocument();
  });
});

describe('LockedChip', () => {
  beforeEach(() => dialog.openAuthDialog.mockClear());

  it('opens sign-up when it is a button', () => {
    render(<LockedChip />);
    fireEvent.click(screen.getByRole('button'));
    expect(dialog.openAuthDialog).toHaveBeenCalledWith('signup');
  });

  it('is plain text inside links', () => {
    render(<LockedChip interactive={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText("Clark's pick")).toBeInTheDocument();
  });
});
