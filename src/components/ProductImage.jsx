import { useEffect, useState } from 'react';
import { buildFallbackProductImage, resolveProductImage } from '../lib/productImages';

export default function ProductImage({ product, className = '' }) {
  const fallbackSource = buildFallbackProductImage(product);
  const [source, setSource] = useState(() => resolveProductImage(product));

  useEffect(() => {
    setSource(resolveProductImage(product));
  }, [product]);

  return (
    <img
      alt={product.name}
      className={className}
      loading="lazy"
      onError={() => setSource(fallbackSource)}
      src={source}
    />
  );
}
