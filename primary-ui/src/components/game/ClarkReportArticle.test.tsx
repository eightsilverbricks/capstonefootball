import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ApiPrediction } from '@/types/prediction';
import ClarkReportArticle from './ClarkReportArticle';

const games = JSON.parse(
  readFileSync(resolve(__dirname, '../../../public/predictions-2024.json'), 'utf-8'),
) as ApiPrediction[];
const game = games.find((g) => g.week === 8 && g.clark_report)!;

describe('ClarkReportArticle', () => {
  it('renders every section of the exported report', () => {
    const report = game.clark_report!;
    render(<ClarkReportArticle game={game} report={report} record="10–5" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(report.headline);
    expect(screen.getByText(report.dek)).toBeTruthy();
    expect(screen.getByText(report.deciding.title)).toBeTruthy();
    expect(screen.getByText(report.underdog.title)).toBeTruthy();
    expect(screen.getByText('What would change my mind')).toBeTruthy();
    expect(screen.getByText(`${game.predicted_winner} ${report.meaning.pct}%`)).toBeTruthy();
    expect(screen.getByText(/10–5 this season/)).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(8);
  });

  it('says so when no betting line is posted', () => {
    render(<ClarkReportArticle game={game} report={{ ...game.clark_report!, line: null }} record="0–0" />);
    expect(screen.getByText('No line yet')).toBeTruthy();
    expect(screen.queryByText('Me vs the betting line')).toBeNull();
  });
});
