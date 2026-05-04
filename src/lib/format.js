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

  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function slugStatus(status) {
  return String(status || 'unknown').toLowerCase();
}

export function statusLabel(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;

  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PURCHASED':
      return 'Purchased';
    case 'SHIPPED':
      return 'Shipped';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'FAILED':
      return 'Failed';
    case 'PENDING':
      return 'Pending';
    default:
      return 'Unknown';
  }
}

export function isActiveOrder(status) {
  return ['PAID', 'PURCHASED', 'SHIPPED'].includes(status);
}

export function canCancelOrder(status) {
  return ['PAID', 'PURCHASED'].includes(status);
}

export function canRateOrder(order, userRole) {
  return userRole === 'TITIPER' && order?.status === 'COMPLETED' && !order?.rating;
}

export function allowedNextStatuses(status) {
  switch (status) {
    case 'PAID':
      return ['PURCHASED'];
    case 'PURCHASED':
      return ['SHIPPED'];
    case 'SHIPPED':
      return ['COMPLETED'];
    default:
      return [];
  }
}
