import "./Skeleton.css";

/* ── Generic shimmer block ── */
export function SkeletonBlock({ width = "100%", height = 14, radius = 8, style = {} }) {
  return (
    <div
      className="shimmer"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

/* ── Wishlist product card skeleton ── */
export function SkeletonProductCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-img shimmer" />
      <div className="skeleton-card-body">
        <div className="skeleton-line shimmer" style={{ width: "75%" }} />
        <div className="skeleton-line-sm shimmer" style={{ width: "45%" }} />
        <div className="skeleton-btn shimmer" />
      </div>
    </div>
  );
}

/* ── Order history card skeleton ── */
export function SkeletonOrderCard() {
  return (
    <div className="skeleton-order-card">
      <div className="skeleton-order-top">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton-line shimmer" style={{ width: 130 }} />
          <div className="skeleton-line-sm shimmer" style={{ width: 90 }} />
        </div>
        <div className="skeleton-badge shimmer" />
      </div>
      <div className="skeleton-order-items">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton-order-item">
            <div className="skeleton-line-sm shimmer" style={{ width: "55%", height: 12 }} />
            <div className="skeleton-line-sm shimmer" style={{ width: "20%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Checkout order item skeleton ── */
export function SkeletonCheckoutItem() {
  return (
    <div className="skeleton-checkout-item">
      <div className="skeleton-checkout-img shimmer" />
      <div className="skeleton-checkout-info">
        <div className="skeleton-line shimmer" style={{ width: "65%" }} />
        <div className="skeleton-line-sm shimmer" style={{ width: "35%" }} />
      </div>
      <div className="skeleton-line shimmer" style={{ width: 60, height: 18 }} />
    </div>
  );
}