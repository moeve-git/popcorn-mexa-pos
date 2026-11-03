import type { Product } from "@/lib/types";

export function ProductVisual({ product, className = "" }: { product: Pick<Product, "emoji" | "image_url" | "name">; className?: string }) {
  if (product.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.image_url} alt={product.name} className={`object-cover ${className}`} draggable={false} />;
  }
  return (
    <span className={`grid place-items-center leading-none ${className}`} aria-hidden>
      {product.emoji || "🍿"}
    </span>
  );
}
