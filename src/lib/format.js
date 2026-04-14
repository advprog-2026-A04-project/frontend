export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function slugStatus(status) {
  return String(status || 'unknown').toLowerCase();
}

export function statusLabel(order) {
  if (!order) {
    return 'Unknown';
  }

  if (order.status === 'FAILED') {
    return 'Checkout failed';
  }

  if (order.status === 'PAID') {
    return 'Paid';
  }

  return 'Pending';
}
