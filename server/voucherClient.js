const baseUrl =
  process.env.VOUCHER_BASE_URL ||
  'https://voucher-promo-api-383620816191.us-central1.run.app';

const adminToken = process.env.VOUCHER_ADMIN_TOKEN || 'dev-admin-token';
const demoVoucherCode = process.env.DEMO_VOUCHER_CODE || 'MILESTONE10';

let bootstrapPromise = null;

function stripCookieAttributes(cookie) {
  return cookie.split(';')[0];
}

function cookieHeaderFromResponse(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) {
      return cookies.map(stripCookieAttributes).join('; ');
    }
  }

  const rawCookie = response.headers.get('set-cookie');
  return rawCookie ? stripCookieAttributes(rawCookie) : '';
}

function formatVoucherTimestamp(date) {
  return new Date(date).toISOString().slice(0, 19);
}

async function getCsrfContext() {
  const response = await fetch(`${baseUrl}/csrf`);
  if (!response.ok) {
    throw new Error(`Voucher CSRF bootstrap failed (${response.status}).`);
  }

  const data = await response.json();
  return {
    token: data.token,
    cookieHeader: cookieHeaderFromResponse(response),
  };
}

async function postWithCsrf(path, body, extraHeaders = {}) {
  const { token, cookieHeader } = await getCsrfContext();

  const headers = {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': token,
    ...extraHeaders,
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function fetchVoucherHealth() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      return {
        status: 'DOWN',
        db: 'UNKNOWN',
      };
    }

    return await response.json();
  } catch {
    return {
      status: 'DOWN',
      db: 'DOWN',
    };
  }
}

export async function ensureDemoVoucher() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const now = new Date();
    const startAt = new Date(now);
    startAt.setDate(startAt.getDate() - 7);

    const endAt = new Date(now);
    endAt.setDate(endAt.getDate() + 90);

    const payload = {
      code: demoVoucherCode,
      discountType: 'PERCENT',
      discountValue: 10,
      startAt: formatVoucherTimestamp(startAt),
      endAt: formatVoucherTimestamp(endAt),
      minSpend: 100000,
      quotaTotal: 50,
    };

    const { response, data } = await postWithCsrf('/admin/vouchers', payload, {
      'X-Admin-Token': adminToken,
    });

    if (response.ok || response.status === 400) {
      return data;
    }

    throw new Error(data?.message || `Demo voucher bootstrap failed (${response.status}).`);
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}

export async function listActiveVouchers() {
  await ensureDemoVoucher().catch(() => undefined);

  const response = await fetch(`${baseUrl}/vouchers/active`);
  if (!response.ok) {
    throw new Error(`Failed to fetch vouchers (${response.status}).`);
  }

  return response.json();
}

export async function validateVoucher({ code, orderAmount, buyerId }) {
  const normalizedCode = String(code || '').trim().toUpperCase();

  if (!normalizedCode) {
    return {
      valid: false,
      code: '',
      orderAmount: Number(orderAmount || 0),
      discountAmount: 0,
      message: 'Voucher code is empty.',
    };
  }

  if (normalizedCode === demoVoucherCode) {
    await ensureDemoVoucher();
  }

  const { response, data } = await postWithCsrf('/vouchers/validate', {
    code: normalizedCode,
    orderAmount: Number(orderAmount || 0),
    buyerId,
  });

  if (!response.ok) {
    throw new Error(data?.message || `Voucher validation failed (${response.status}).`);
  }

  return data;
}

export async function claimVoucher({ code, orderId, orderAmount, buyerId }) {
  const normalizedCode = String(code || '').trim().toUpperCase();

  if (!normalizedCode) {
    return {
      success: false,
      code: '',
      orderId,
      orderAmount: Number(orderAmount || 0),
      discountApplied: 0,
      message: 'Voucher code is empty.',
    };
  }

  if (normalizedCode === demoVoucherCode) {
    await ensureDemoVoucher();
  }

  const { response, data } = await postWithCsrf('/vouchers/claim', {
    code: normalizedCode,
    orderId,
    orderAmount: Number(orderAmount || 0),
    buyerId,
  });

  if (!response.ok) {
    throw new Error(data?.message || `Voucher claim failed (${response.status}).`);
  }

  return data;
}

export const voucherConfig = {
  baseUrl,
  demoVoucherCode,
};
