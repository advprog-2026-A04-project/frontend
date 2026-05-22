import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  canCancelOrder,
  canRateOrder,
  formatCurrency,
  formatDate,
  isActiveOrder,
  slugStatus,
  statusLabel,
} from './format';

describe('format helpers', () => {
  it('formats money, dates, and unknown values safely', () => {
    expect(formatCurrency(125000)).toContain('125.000');
    expect(formatCurrency(undefined)).toContain('0');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('2026-05-22T08:00:00Z')).toMatch(/2026|Mei|May/);
    expect(slugStatus()).toBe('unknown');
  });

  it('maps order statuses to labels and workflow decisions', () => {
    expect(statusLabel('PAID')).toBe('Paid');
    expect(statusLabel({ status: 'PURCHASED' })).toBe('Purchased');
    expect(statusLabel('SHIPPED')).toBe('Shipped');
    expect(statusLabel('COMPLETED')).toBe('Completed');
    expect(statusLabel('CANCELLED')).toBe('Cancelled');
    expect(statusLabel('FAILED')).toBe('Failed');
    expect(statusLabel('PENDING')).toBe('Pending');
    expect(statusLabel('OTHER')).toBe('Unknown');

    expect(isActiveOrder('PAID')).toBe(true);
    expect(isActiveOrder('COMPLETED')).toBe(false);
    expect(canCancelOrder('PAID')).toBe(true);
    expect(canCancelOrder('SHIPPED')).toBe(false);
    expect(canRateOrder({ status: 'COMPLETED' }, 'TITIPER')).toBe(true);
    expect(canRateOrder({ status: 'COMPLETED', rating: { productRating: 5 } }, 'TITIPER')).toBe(false);
    expect(canRateOrder({ status: 'PAID' }, 'TITIPER')).toBe(false);
    expect(canRateOrder({ status: 'COMPLETED' }, 'ADMIN')).toBe(false);
  });

  it('returns allowed lifecycle transitions', () => {
    expect(allowedNextStatuses('PAID')).toEqual(['PURCHASED']);
    expect(allowedNextStatuses('PURCHASED')).toEqual(['SHIPPED']);
    expect(allowedNextStatuses('SHIPPED')).toEqual(['COMPLETED']);
    expect(allowedNextStatuses('COMPLETED')).toEqual([]);
  });
});
