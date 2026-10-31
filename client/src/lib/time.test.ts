import { describe, expect, it } from 'vitest';
import { duration, relativeTime } from './time';

describe('relativeTime', () => {
  const now = Date.UTC(2026, 9, 30, 12);

  it('reads recent times in minutes, hours and days', () => {
    expect(relativeTime(now - 10_000, now)).toBe('just now');
    expect(relativeTime(now - 50_000, now)).toBe('1m ago');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3h ago');
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe('2d ago');
  });

  it('reads the future too, and falls back to the date after a week', () => {
    expect(relativeTime(now + 5 * 60_000, now)).toBe('in 5m');
    expect(relativeTime(now - 30 * 86_400_000, now)).not.toMatch(/ago/);
  });
});

describe('duration', () => {
  it('reads an uptime in its two largest units', () => {
    expect(duration(-5)).toBe('0s');
    expect(duration(45_000)).toBe('45s');
    expect(duration(12 * 60_000 + 30_000)).toBe('12m');
    expect(duration(3 * 3_600_000)).toBe('3h');
    expect(duration(3 * 3_600_000 + 5 * 60_000)).toBe('3h 5m');
    expect(duration(2 * 86_400_000 + 4 * 3_600_000 + 60_000)).toBe('2d 4h');
  });
});
