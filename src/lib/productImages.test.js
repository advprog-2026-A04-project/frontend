import { describe, expect, it } from 'vitest';
import { buildFallbackProductImage, resolveProductImage } from './productImages';

describe('productImages', () => {
  it('returns a generated fallback image when the product has no imageUrl', () => {
    const source = resolveProductImage({
      name: 'Rare Sonny Angel Winter Wonderland',
      category: 'Collectible',
      originLocation: 'South Korea',
      stock: 15,
    });

    expect(source.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('keeps a valid remote imageUrl when one exists', () => {
    const source = resolveProductImage({
      name: 'Demo product',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(source).toBe('https://example.com/image.jpg');
  });

  it('includes product details in the generated fallback', () => {
    const source = buildFallbackProductImage({
      name: 'Dior Addict Lip Glow Set',
      category: 'Beauty',
      originLocation: 'France',
      stock: 20,
    });

    const decoded = decodeURIComponent(source);
    expect(decoded).toContain('Dior Addict Lip Glow Set');
    expect(decoded).toContain('Origin: France');
    expect(decoded).toContain('Stock 20');
  });

  it('uses safe defaults and truncates long generated fallback text', () => {
    const source = buildFallbackProductImage({
      name: 'A very long marketplace product name that should be trimmed before it is embedded into the generated SVG title',
    });
    const defaultSource = buildFallbackProductImage();

    expect(decodeURIComponent(source)).toContain('A very long marketplace product name that should be...');
    expect(decodeURIComponent(defaultSource)).toContain('JSON product');
    expect(decodeURIComponent(defaultSource)).toContain('Stock -');
    expect(resolveProductImage({ imageUrl: 'data:image/png;base64,abc' })).toBe('data:image/png;base64,abc');
  });
});
