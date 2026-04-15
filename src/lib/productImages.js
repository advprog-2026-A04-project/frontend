function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pickPalette(category) {
  const key = String(category || '').toLowerCase();

  if (key.includes('ticket')) {
    return {
      start: '#7c3aed',
      end: '#312e81',
      accent: '#f59e0b',
    };
  }

  if (key.includes('beauty')) {
    return {
      start: '#ec4899',
      end: '#9d174d',
      accent: '#fbcfe8',
    };
  }

  if (key.includes('collectible')) {
    return {
      start: '#f97316',
      end: '#9a3412',
      accent: '#fde68a',
    };
  }

  return {
    start: '#0f766e',
    end: '#164e63',
    accent: '#d9f99d',
  };
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
}

export function buildFallbackProductImage(product) {
  const palette = pickPalette(product?.category || product?.originLocation);
  const title = escapeXml(truncate(product?.name || 'JSON product', 52));
  const category = escapeXml(truncate(product?.category || 'Demo product', 22));
  const origin = escapeXml(truncate(product?.originLocation || 'Real service data', 24));
  const stock = escapeXml(product?.stock ?? '-');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 960" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="960" rx="56" fill="url(#bg)" />
      <circle cx="1010" cy="170" r="190" fill="rgba(255,255,255,0.10)" />
      <circle cx="140" cy="150" r="140" fill="rgba(255,255,255,0.12)" />
      <rect x="78" y="82" width="236" height="54" rx="27" fill="rgba(255,255,255,0.16)" />
      <text x="110" y="118" fill="#ffffff" font-family="Space Grotesk, Arial, sans-serif" font-size="30" font-weight="700">
        ${category}
      </text>
      <text x="78" y="650" fill="#ffffff" font-family="Space Grotesk, Arial, sans-serif" font-size="76" font-weight="700">
        ${title}
      </text>
      <text x="78" y="730" fill="rgba(255,255,255,0.88)" font-family="Space Grotesk, Arial, sans-serif" font-size="34">
        Origin: ${origin}
      </text>
      <rect x="78" y="786" width="212" height="92" rx="26" fill="rgba(255,255,255,0.16)" />
      <text x="112" y="846" fill="${palette.accent}" font-family="Space Grotesk, Arial, sans-serif" font-size="34" font-weight="700">
        Stock ${stock}
      </text>
      <path d="M825 640c-78-85-223-85-301 0-45-121 14-259 135-316 120-57 264-11 333 105 62 106 48 244-37 345-29-53-74-99-130-134z"
        fill="rgba(255,255,255,0.12)" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function resolveProductImage(product) {
  const candidate = String(product?.imageUrl || '').trim();
  if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('data:image/')) {
    return candidate;
  }

  return buildFallbackProductImage(product);
}
