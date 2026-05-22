const STORAGE_KEY = 'json.productReviews';

function storageKey(productId, userId) {
  return `${userId || 'guest'}:${productId}`;
}

function readAllReviews() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAllReviews(reviews) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

export function findProductReviewFromOrders(orders, productId, userId) {
  const matchingOrders = [...(orders || [])]
    .filter((order) => order?.rating && Array.isArray(order.items))
    .filter((order) => order.items.some((item) => String(item.productId) === String(productId)))
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));

  const order = matchingOrders[0];
  if (!order) {
    return null;
  }

  return {
    ...order.rating,
    orderId: order.id,
    productId,
    userId,
    submittedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
  };
}

export function readStoredProductReview(productId, userId) {
  return readAllReviews()[storageKey(productId, userId)] || null;
}

export function rememberOrderProductReviews(order, userId) {
  if (!order?.rating || !Array.isArray(order.items)) {
    return;
  }

  const reviews = readAllReviews();
  order.items.forEach((item) => {
    reviews[storageKey(item.productId, userId)] = {
      ...order.rating,
      orderId: order.id,
      productId: item.productId,
      userId,
      submittedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    };
  });
  writeAllReviews(reviews);
}
