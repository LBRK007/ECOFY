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

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isWishlisted, toggleWishlist, user } = useWishlist();
  const { toast, ToastContainer } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProduct({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleWishlistToggle = async () => {
    if (!user) { navigate("/login"); return; }
    const added = await toggleWishlist(id);
    toast(
      added ? "Added to wishlist 🤍" : "Removed from wishlist",
      added ? "success" : "info"
    );
  };

  if (loading) return <h2 style={{ padding: "50px" }}>Loading product...</h2>;
  if (!product) return <h2 style={{ padding: "50px" }}>Product not found ❌</h2>;

  const stock = product.stock ?? 0;
  const wishlisted = isWishlisted(id);

  return (
    <motion.div
      style={{ padding: "60px", maxWidth: "1000px", margin: "0 auto" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ToastContainer />

      {/* ── Product section ── */}
      <div style={{ display: "flex", gap: "60px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Image */}
        <div style={{ position: "relative" }}>
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "380px",
              maxWidth: "100%",
              borderRadius: "16px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* Heart on image corner */}
          <div style={{ position: "absolute", top: "12px", right: "12px" }}>
            <HeartButton
              productId={id}
              size={24}
              style={{
                background: "rgba(255,255,255,0.9)",
                borderRadius: "50%",
                padding: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
          </div>
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <h1 style={{ margin: "0 0 10px" }}>{product.name}</h1>

          {/* Rating */}
          {reviewStats.count > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <StarRating rating={reviewStats.average} size={20} />
              <span style={{ fontSize: "15px", color: "#555" }}>
                {reviewStats.average.toFixed(1)}
              </span>
              <span style={{ fontSize: "14px", color: "#aaa" }}>
                ({reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "#bbb", marginBottom: "14px" }}>No reviews yet</p>
          )}

          <h2 style={{ color: "#2E7D32", margin: "0 0 16px" }}>₹ {product.price}</h2>

          <p style={{ lineHeight: "1.7", color: "#555", marginBottom: "20px" }}>
            {product.description || "100% natural and eco-friendly product made with love 🌿"}
          </p>

          {/* Stock */}
          <p style={{
            fontWeight: "500",
            marginBottom: "24px",
            color: stock > 5 ? "#2E7D32" : stock > 0 ? "#e65100" : "#c62828",
          }}>
            {stock > 5 ? `In Stock (${stock})` : stock > 0 ? `Only ${stock} left ⚠` : "Out of Stock ❌"}
          </p>

          {/* ── Action buttons row ── */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => addToCart(product)}
              disabled={stock === 0}
              style={{
                padding: "12px 26px",
                backgroundColor: stock === 0 ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: stock === 0 ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              {stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>

            {stock > 0 && (
              <button
                onClick={() => { addToCart(product); navigate("/cart"); }}
                style={{
                  padding: "12px 26px",
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                Buy Now
              </button>
            )}

            {/* ── Standalone wishlist button with label ── */}
            <button
              onClick={handleWishlistToggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "11px 18px",
                background: wishlisted ? "#fff0f0" : "#f5f5f5",
                color: wishlisted ? "#e53935" : "#555",
                border: `1px solid ${wishlisted ? "#ffcdd2" : "#ddd"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={wishlisted ? "#e53935" : "none"}
                stroke={wishlisted ? "#e53935" : "#888"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishlisted ? "Wishlisted" : "Save to Wishlist"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div style={{ marginTop: "60px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <Reviews productId={id} onStatsChange={setReviewStats} />
      </div>
    </motion.div>
  );
}

export default ProductDetails;