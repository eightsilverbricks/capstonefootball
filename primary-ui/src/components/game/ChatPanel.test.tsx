import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatPanel from './ChatPanel';
import type { LiveAware } from '@/lib/live';

const repo = vi.hoisted(() => ({
  fetchChat: vi.fn(),
  fetchGamePicks: vi.fn(),
  fetchAuthors: vi.fn(),
  postChat: vi.fn(),
  reportChat: vi.fn(),
  deleteChat: vi.fn(),
  subscribeChat: vi.fn(),
}));
const fx = vi.hoisted(() => ({ toast: vi.fn(), confetti: vi.fn() }));
const me = { id: 'me', handle: 'zane', displayName: 'Zane', email: 'z@example.test', favoriteTeam: 'DEN', createdAt: '2026-01-01' };

vi.mock('@/data/socialRepository', async (orig) => ({ ...(await orig<typeof import('@/data/socialRepository')>()), ...repo }));
vi.mock('@/lib/fx', () => fx);
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: me, isSignedIn: true }) }));
vi.mock('@/hooks/useAuthDialog', () => ({ openAuthDialog: vi.fn() }));

const game = {
  season: 2026, week: 6, away_team: 'SEA', home_team: 'DEN', predicted_winner: 'DEN',
  home_win_prob: 0.6, away_win_prob: 0.4, live: { status: 'in', updated_at: new Date().toISOString() },
} as unknown as LiveAware;
const social = { reactions: { counts: {}, mine: {} }, polls: { counts: {}, mine: {} }, react: vi.fn(), castVote: vi.fn() };
const renderChat = () => render(<ChatPanel game={game} gameKey="2026_6_SEA_DEN" plays={[]} social={social} />);
const row = (id: number, userId = 'u2', body = 'Lets go') => ({
  id, userId, body, createdAt: new Date(Date.now() - 60_000).toISOString(),
  author: { handle: 'fan', displayName: 'Fan Two', favoriteTeam: 'SEA' },
});

describe('ChatPanel', () => {
  beforeEach(() => {
    Object.values(repo).forEach((f) => f.mockReset());
    fx.toast.mockReset();
    repo.fetchGamePicks.mockResolvedValue({});
    repo.fetchAuthors.mockResolvedValue({});
    repo.subscribeChat.mockReturnValue(() => {});
    localStorage.clear();
  });

  it('shows a loading line, then the messages', async () => {
    repo.fetchChat.mockResolvedValue([row(1)]);
    renderChat();
    expect(screen.getByText('Loading chat…')).toBeInTheDocument();
    expect(await screen.findByText('Lets go')).toBeInTheDocument();
    expect(screen.getByText('1 message')).toBeInTheDocument();
  });

  it('says so when the chat fails to load, and retries', async () => {
    repo.fetchChat.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([row(1)]);
    renderChat();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Lets go')).toBeInTheDocument();
  });

  it('invites the first message when the chat is empty', async () => {
    repo.fetchChat.mockResolvedValue([]);
    renderChat();
    expect(await screen.findByText('No messages yet. Start it off.')).toBeInTheDocument();
  });

  it('shows your message as soon as the server accepts it, without waiting on realtime', async () => {
    repo.fetchChat.mockResolvedValue([]);
    repo.postChat.mockResolvedValue({ ok: true, id: 99 });
    renderChat();
    await screen.findByText('No messages yet. Start it off.');
    fireEvent.change(screen.getByLabelText('Chat message'), { target: { value: 'Broncos by 7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Broncos by 7')).toBeInTheDocument();
    expect(screen.getByLabelText('Chat message')).toHaveValue('');
  });

  it('keeps your own message visible with the spoiler shield on', async () => {
    localStorage.setItem('clark.spoilerShield', '60');
    repo.fetchChat.mockResolvedValue([]);
    repo.postChat.mockResolvedValue({ ok: true, id: 7 });
    renderChat();
    await waitFor(() => expect(repo.fetchChat).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Chat message'), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('mine')).toBeInTheDocument();
  });

  it('explains a moderation or rate-limit refusal and keeps the draft', async () => {
    repo.fetchChat.mockResolvedValue([]);
    repo.postChat.mockResolvedValue({ ok: false, error: 'too_fast' });
    renderChat();
    fireEvent.change(screen.getByLabelText('Chat message'), { target: { value: 'again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Slow down');
    expect(screen.getByLabelText('Chat message')).toHaveValue('again');
  });

  it('confirms a report, and rolls it back if it fails', async () => {
    repo.fetchChat.mockResolvedValue([row(1), row(2, 'u3', 'Other')]);
    repo.reportChat.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('nope'));
    renderChat();
    await screen.findByText('Lets go');
    const [first, second] = screen.getAllByRole('button', { name: 'Report' });
    await act(async () => { fireEvent.click(first); });
    expect(screen.getByText('Reported')).toBeInTheDocument();
    await act(async () => { fireEvent.click(second); });
    expect(fx.toast).toHaveBeenLastCalledWith("Couldn't send that report. Try again.");
    expect(screen.getAllByRole('button', { name: 'Report' })).toHaveLength(1);
  });

  it('asks before deleting your own message', async () => {
    repo.fetchChat.mockResolvedValue([row(5, 'me', 'oops')]);
    repo.deleteChat.mockResolvedValue(undefined);
    renderChat();
    await screen.findByText('oops');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(repo.deleteChat).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tap again to delete' })); });
    expect(repo.deleteChat).toHaveBeenCalledWith(5);
    expect(screen.queryByText('oops')).not.toBeInTheDocument();
  });
});
