import { randomUUID } from 'node:crypto';

const DEFAULT_BALANCE = 2_000_000;
const DEMO_USER_PASSWORD = 'Demo123!';

const products = [
  {
    id: 1,
    name: 'Nike SB Dunk Low Travis Scott',
    description: 'Limited sneakers dengan detail premium untuk demo katalog dan checkout.',
    category: 'Sneakers',
    price: 4_500_000,
    stock: 12,
    originLocation: 'United States',
    jastiperName: 'Rama Pratama',
    purchaseDate: '2026-04-04T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    name: 'Adidas Samba OG Wales Bonner',
    description: 'Sneakers vintage yang cukup mahal untuk memicu wallet validation.',
    category: 'Sneakers',
    price: 3_250_000,
    stock: 9,
    originLocation: 'United Kingdom',
    jastiperName: 'Rama Pratama',
    purchaseDate: '2026-04-07T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    name: 'Coldplay Concert Ticket CAT 1',
    description: 'Tiket konser resmi untuk menguji checkout sukses dengan voucher.',
    category: 'Event',
    price: 2_100_000,
    stock: 6,
    originLocation: 'Singapore',
    jastiperName: 'Maya Lestari',
    purchaseDate: '2026-04-11T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 4,
    name: 'Taylor Swift The Eras Tour Ticket',
    description: 'Stok rendah untuk mendemokan validasi inventory yang terlihat jelas.',
    category: 'Event',
    price: 6_850_000,
    stock: 3,
    originLocation: 'Japan',
    jastiperName: 'Maya Lestari',
    purchaseDate: '2026-04-12T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 5,
    name: 'Dior Addict Lip Glow Set',
    description: 'Produk beauty yang nyaman untuk happy-path tanpa top-up besar.',
    category: 'Beauty',
    price: 1_350_000,
    stock: 20,
    originLocation: 'France',
    jastiperName: 'Nadia K',
    purchaseDate: '2026-04-09T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 6,
    name: 'Rare Sonny Angel Winter Wonderland',
    description: 'Collectible dengan harga aman untuk milestone 25% browse and checkout.',
    category: 'Collectible',
    price: 780_000,
    stock: 15,
    originLocation: 'South Korea',
    jastiperName: 'Nadia K',
    purchaseDate: '2026-04-05T09:00:00Z',
    imageUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80',
  },
];

const users = new Map();
const usersByEmail = new Map();
const sessions = new Map();
const wallets = new Map();
const ordersByUserId = new Map();
let nextUserId = 1001;
let nextOrderId = 1001;
let nextWalletTxnId = 1;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    walletBalance: wallets.get(user.id) ?? DEFAULT_BALANCE,
  };
}

function cloneProduct(product) {
  return { ...product };
}

function cloneOrder(order) {
  return structuredClone(order);
}

function getMutableOrdersForUser(userId) {
  if (!ordersByUserId.has(userId)) {
    ordersByUserId.set(userId, []);
  }

  return ordersByUserId.get(userId);
}

function getMutableUserById(userId) {
  const user = users.get(userId);
  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  return user;
}

function getMutableProductById(productId) {
  const product = products.find((candidate) => candidate.id === Number(productId));
  if (!product) {
    throw createHttpError(404, 'Product not found.');
  }

  return product;
}

function getMutableOrder(userId, orderId) {
  const order = getMutableOrdersForUser(userId).find((candidate) => candidate.id === orderId);
  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  return order;
}

function seedDemoUser() {
  const demoUser = {
    id: 1000,
    email: 'demo@json.app',
    username: 'Demo Buyer',
    password: DEMO_USER_PASSWORD,
    role: 'TITIPER',
  };

  users.set(demoUser.id, demoUser);
  usersByEmail.set(demoUser.email, demoUser);
  wallets.set(demoUser.id, DEFAULT_BALANCE);
  ordersByUserId.set(demoUser.id, []);
}

seedDemoUser();

export function registerUser({ email, username, password }) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = String(password || '').trim();
  const trimmedUsername = String(username || '').trim();

  if (!normalizedEmail || !trimmedPassword || !trimmedUsername) {
    throw createHttpError(400, 'Email, username, and password are required.');
  }

  if (usersByEmail.has(normalizedEmail)) {
    throw createHttpError(409, 'An account with that email already exists.');
  }

  const user = {
    id: nextUserId++,
    email: normalizedEmail,
    username: trimmedUsername,
    password: trimmedPassword,
    role: 'TITIPER',
  };

  users.set(user.id, user);
  usersByEmail.set(user.email, user);
  wallets.set(user.id, DEFAULT_BALANCE);
  ordersByUserId.set(user.id, []);

  return sanitizeUser(user);
}

export function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = String(password || '').trim();
  const user = usersByEmail.get(normalizedEmail);

  if (!user || user.password !== trimmedPassword) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  return sanitizeUser(user);
}

export function createSession(userId) {
  const token = randomUUID();
  const user = sanitizeUser(getMutableUserById(userId));
  sessions.set(token, { token, userId, createdAt: new Date().toISOString() });
  return {
    token,
    user,
  };
}

export function getSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  return {
    token: session.token,
    user: sanitizeUser(getMutableUserById(session.userId)),
  };
}

export function clearSession(token) {
  sessions.delete(token);
}

export function listProducts(query = '') {
  const needle = String(query || '').trim().toLowerCase();

  return products
    .filter((product) => {
      if (!needle) {
        return true;
      }

      return [
        product.name,
        product.description,
        product.category,
        product.originLocation,
        product.jastiperName,
      ].some((field) => field.toLowerCase().includes(needle));
    })
    .map(cloneProduct);
}

export function getProduct(productId) {
  return cloneProduct(getMutableProductById(productId));
}

export function getWallet(userId) {
  getMutableUserById(userId);

  return {
    balance: wallets.get(userId) ?? DEFAULT_BALANCE,
    currency: 'IDR',
  };
}

export function topUpWallet(userId, amount) {
  const numericAmount = Number(amount);
  getMutableUserById(userId);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createHttpError(400, 'Top-up amount must be greater than zero.');
  }

  const nextBalance = (wallets.get(userId) ?? DEFAULT_BALANCE) + numericAmount;
  wallets.set(userId, nextBalance);

  return {
    transactionId: `TOP-${String(nextWalletTxnId++).padStart(4, '0')}`,
    amount: numericAmount,
    balance: nextBalance,
  };
}

export function listOrders(userId) {
  getMutableUserById(userId);
  return getMutableOrdersForUser(userId).map(cloneOrder);
}

export function getOrder(userId, orderId) {
  getMutableUserById(userId);
  return cloneOrder(getMutableOrder(userId, orderId));
}

export function createPendingOrder(userId, { productId, quantity, shippingAddress, voucherCode }) {
  const product = getMutableProductById(productId);
  const qty = Number(quantity);
  const address = String(shippingAddress || '').trim();
  const normalizedVoucherCode = String(voucherCode || '').trim().toUpperCase();

  getMutableUserById(userId);

  if (!address) {
    throw createHttpError(400, 'Shipping address is required.');
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    throw createHttpError(400, 'Quantity must be a positive integer.');
  }

  const lineTotal = product.price * qty;
  const order = {
    id: `ORD-${String(nextOrderId++).padStart(4, '0')}`,
    userId,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    failureReason: null,
    shippingAddress: address,
    voucherCode: normalizedVoucherCode || '',
    voucherMessage: normalizedVoucherCode ? 'Pending validation' : 'Not used',
    subtotal: lineTotal,
    discountTotal: 0,
    totalPaid: lineTotal,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        lineTotal,
      },
    ],
  };

  getMutableOrdersForUser(userId).unshift(order);
  return cloneOrder(order);
}

export function markOrderFailed(
  userId,
  orderId,
  { code = 'CHECKOUT_FAILED', message, voucherCode = '', voucherMessage = 'Not applied', discountTotal, totalPaid },
) {
  const order = getMutableOrder(userId, orderId);

  order.status = 'FAILED';
  order.paymentStatus = 'FAILED';
  order.failureReason = {
    code,
    message,
  };
  order.voucherCode = String(voucherCode || '').trim().toUpperCase();
  order.voucherMessage = voucherMessage;
  order.discountTotal = Number(discountTotal ?? order.discountTotal ?? 0);
  order.totalPaid = Number(totalPaid ?? order.totalPaid ?? order.subtotal);
  order.updatedAt = new Date().toISOString();

  return cloneOrder(order);
}

export function completeOrder(
  userId,
  orderId,
  { productId, quantity, discountTotal, totalPaid, voucherCode = '', voucherMessage = 'Voucher applied' },
) {
  const order = getMutableOrder(userId, orderId);
  const product = getMutableProductById(productId);
  const qty = Number(quantity);
  const currentBalance = wallets.get(userId) ?? DEFAULT_BALANCE;

  if (product.stock < qty) {
    throw createHttpError(409, `Only ${product.stock} items left in stock.`);
  }

  if (currentBalance < totalPaid) {
    throw createHttpError(409, 'Wallet balance is insufficient.');
  }

  product.stock -= qty;
  wallets.set(userId, currentBalance - totalPaid);

  order.status = 'PAID';
  order.paymentStatus = 'SUCCESS';
  order.failureReason = null;
  order.voucherCode = String(voucherCode || '').trim().toUpperCase();
  order.voucherMessage = voucherMessage;
  order.discountTotal = Number(discountTotal ?? 0);
  order.totalPaid = Number(totalPaid);
  order.updatedAt = new Date().toISOString();

  return cloneOrder(order);
}

export function getServiceModes() {
  return {
    auth: {
      mode: 'local-adapter',
      note: 'The deployed Auth/Profile service did not expose the documented token flow during verification.',
    },
    inventory: {
      mode: 'seed-adapter',
      note: 'The deployed Inventory service timed out, so catalog and stock checks use a local in-memory adapter.',
    },
    wallet: {
      mode: 'local-adapter',
      note: 'The deployed Wallet service responds, but its runtime contract does not match the documented request shapes.',
    },
    order: {
      mode: 'local-adapter',
      note: 'The deployed Order service returned timeouts and 502s during verification.',
    },
  };
}

export function getDemoCredentials() {
  return {
    email: 'demo@json.app',
    password: DEMO_USER_PASSWORD,
  };
}
