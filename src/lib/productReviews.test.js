import { beforeEach, describe, expect, it } from 'vitest';
import {
  findProductReviewFromOrders,
  readStoredProductReview,
  rememberOrderProductReviews,
} from './productReviews';

describe('product review persistence helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores submitted order ratings for each product line', () => {
    rememberOrderProductReviews(
      {
        id: 42,
        updatedAt: '2026-05-22T10:00:00Z',
        rating: {
          productRating: 5,
          jastiperRating: 4,
          comment: 'Clean delivery.',
        },
        items: [{ productId: 'p-1' }, { productId: 'p-2' }],
      },
      1000,
    );

    expect(readStoredProductReview('p-1', 1000)).toMatchObject({
      orderId: 42,
      productRating: 5,
      comment: 'Clean delivery.',
    });
    expect(readStoredProductReview('p-2', 1000)).toMatchObject({
      jastiperRating: 4,
    });
  });

  it('derives the latest matching review from order history', () => {
    const olderOrder = {
      id: 1,
      createdAt: '2026-05-20T10:00:00Z',
      rating: { productRating: 3, jastiperRating: 3, comment: 'Older.' },
      items: [{ productId: 'p-1' }],
    };
    const newerOrder = {
      id: 2,
      updatedAt: '2026-05-22T10:00:00Z',
      rating: { productRating: 5, jastiperRating: 5, comment: 'Latest.' },
      items: [{ productId: 'p-1' }],
    };

    expect(findProductReviewFromOrders([olderOrder, newerOrder], 'p-1', 1000)).toMatchObject({
      orderId: 2,
      productRating: 5,
      comment: 'Latest.',
    });
    expect(findProductReviewFromOrders([olderOrder], 'p-1')).toMatchObject({
      userId: undefined,
      submittedAt: '2026-05-20T10:00:00Z',
    });
    expect(findProductReviewFromOrders([olderOrder], 'missing', 1000)).toBeNull();
    expect(findProductReviewFromOrders(undefined, 'missing', 1000)).toBeNull();
  });

  it('ignores malformed storage and orders without rating details', () => {
    localStorage.setItem('json.productReviews', '{bad json');

    expect(readStoredProductReview('p-1', 1000)).toBeNull();
    expect(() => rememberOrderProductReviews({ items: [{ productId: 'p-1' }] }, 1000)).not.toThrow();
    expect(() => rememberOrderProductReviews(null, 1000)).not.toThrow();
    expect(() => rememberOrderProductReviews({ rating: { productRating: 5 } }, 1000)).not.toThrow();
    expect(readStoredProductReview('p-1', 1000)).toBeNull();
  });

  it('uses guest storage keys and a generated timestamp when needed', () => {
    rememberOrderProductReviews(
      {
        id: 99,
        rating: {
          productRating: 4,
          jastiperRating: 4,
          comment: '',
        },
        items: [{ productId: 'guest-product' }],
      },
    );

    expect(readStoredProductReview('guest-product')).toMatchObject({
      orderId: 99,
      productRating: 4,
    });
    expect(readStoredProductReview('guest-product').submittedAt).toBeTruthy();
  });
});
