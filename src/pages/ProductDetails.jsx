import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import Reviews from "../components/Reviews";
import StarRating from "../components/StarRating";
import HeartButton from "../components/HeartButton";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../hooks/useToast";
import "./ProductDetails.css";

const ECO_FEATURES = [
  "100% natural & sustainably sourced bamboo",
  "Biodegradable and plastic-free",
  "Gentle on skin and the environment",
  "Ethically manufactured",
];

function ProductDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToCart }                        = useContext(CartContext);
  const { isWishlisted, toggleWishlist, user } = useWishlist();
  const { toast, ToastContainer }            = useToast();

  const [product,     setProduct]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [cartAdded,   setCartAdded]   = useState(false);

  // ✅ NEW: timer state
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "products", id));
        if (snap.exists()) setProduct({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // ✅ NEW: countdown logic
  useEffect(() => {
    if (!product?.expiresAt) return;

    const interval = setInterval(() => {
      const diff = new Date(product.expiresAt).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        if (h > 0) {
          setTimeLeft(`${h}h ${m}m`);
        } else {
          setTimeLeft(`${m}m ${s}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [product]);

  const handleWishlist = async () => {
    if (!user) { navigate("/login"); return; }
    const added = await toggleWishlist(id);
    toast(added ? "Added to wishlist 🤍" : "Removed from wishlist", added ? "success" : "info");
  };

  const handleAddToCart = () => {
    if (!product || stock === 0) return;
    addToCart(product);
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 1800);
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="pd-loading">
      <div className="pd-spinner" />
      <span>Loading product…</span>
    </div>
  );

  if (!product) return (
    <div className="pd-not-found">
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🌱</div>
      <h2>Product not found</h2>
      <p>We couldn't locate the item you're looking for.</p>
      <button
        onClick={() => navigate("/products")}
        style={{ marginTop: "24px", padding: "12px 28px", background: "#1a3a2a", color: "#fff", border: "none", borderRadius: "100px", cursor: "pointer", fontFamily: "'Jost',sans-serif", fontWeight: 600 }}
      >
        Back to Products
      </button>
    </div>
  );

  const stock      = product.stock ?? 0;
  const wishlisted = isWishlisted(id);

  const stockInfo = stock > 5
    ? { cls: "pd-stock-high", text: `In Stock (${stock} available)` }
    : stock > 0
    ? { cls: "pd-stock-low",  text: `Only ${stock} left!` }
    : { cls: "pd-stock-out",  text: "Out of Stock" };

  return (
    <motion.div
      className="pd-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <ToastContainer />

      <button className="pd-back" onClick={() => navigate("/products")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Products
      </button>

      <div className="pd-grid">

        <motion.div
          className="pd-image-wrap"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="pd-image-main">
            <img src={product.image} alt={product.name} />
            <button className="pd-heart" onClick={handleWishlist}>
              <HeartButton productId={id} size={22} />
            </button>
          </div>

          <div className="pd-eco-strip">
            <span className="pd-eco-pill">🌿 Eco-Friendly</span>
            <span className="pd-eco-pill">🎋 Bamboo</span>
            <span className="pd-eco-pill">♻️ Biodegradable</span>
          </div>
        </motion.div>

        <motion.div
          className="pd-details"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="pd-tag">🪴 ECOFY Collection</div>

          <h1 className="pd-name">{product.name}</h1>

          {reviewStats.count > 0 ? (
            <div className="pd-rating">
              <StarRating rating={reviewStats.average} size={17} />
              <span className="pd-rating-num">{reviewStats.average.toFixed(1)}</span>
              <span className="pd-rating-count">
                ({reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <p className="pd-no-rating">No reviews yet — be the first!</p>
          )}

          <div className="pd-divider" />

          <div className="pd-price">₹{product.price?.toLocaleString()}</div>

          {/* ✅ TIME LIMIT DISPLAY */}
          {timeLeft && (
            <div className="pd-timer">
              ⏳ {timeLeft} left
            </div>
          )}

          <p className="pd-desc">
            {product.description ||
              "100% natural and eco-friendly product made with care. Designed to bring a touch of nature into your daily routine while reducing your plastic footprint."}
          </p>

          <div>
            <span className={`pd-stock ${stockInfo.cls}`}>
              <span className="pd-stock-dot" />
              {stockInfo.text}
            </span>
          </div>

          <div className="pd-divider" />

          <div className="pd-features">
            {ECO_FEATURES.map((f, i) => (
              <div className="pd-feature" key={i}>
                <span className="pd-feature-dot" />
                {f}
              </div>
            ))}
          </div>

          <div className="pd-actions">
            <motion.button
              className={`pd-btn-cart${cartAdded ? " added" : ""}`}
              whileHover={stock > 0 ? { scale: 1.02 } : {}}
              whileTap={stock > 0 ? { scale: 0.97 } : {}}
              onClick={handleAddToCart}
              disabled={stock === 0}
            >
              {cartAdded ? "✓ Added!" : stock === 0 ? "Out of Stock" : "Add to Cart"}
            </motion.button>

            {stock > 0 && (
              <motion.button
                className="pd-btn-buy"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { addToCart(product); navigate("/cart"); }}
              >
               Buy Now
              </motion.button>
            )}

            <motion.button
              className={`pd-btn-wish${wishlisted ? " wishlisted" : ""}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWishlist}
            >
              {wishlisted ? "Saved" : "Save"}
            </motion.button>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="pd-reviews"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="pd-reviews-title">Customer Reviews</h2>
        <Reviews productId={id} onStatsChange={setReviewStats} />
      </motion.div>
    </motion.div>
  );
}

export default ProductDetails;