import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import StarRating from "../components/StarRating";
import HeartButton from "../components/HeartButton";
import "./Products.css";

function Products() {
  const [products,     setProducts]     = useState([]);
  const [ratings,      setRatings]      = useState({});
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState("");
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const productSnap = await getDocs(collection(db, "products"));
        const list = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(list);

        const reviewSnap = await getDocs(collection(db, "reviews"));
        const grouped = {};
        reviewSnap.docs.forEach(d => {
          const { productId, rating } = d.data();
          if (!grouped[productId]) grouped[productId] = [];
          grouped[productId].push(rating);
        });
        const ratingMap = {};
        Object.entries(grouped).forEach(([pid, rList]) => {
          ratingMap[pid] = {
            average: rList.reduce((s, r) => s + r, 0) / rList.length,
            count:   rList.length,
          };
        });
        setRatings(ratingMap);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ✅ FILTER: remove expired products
  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(p => {
      if (!p.expiresAt) return true;
      return new Date(p.expiresAt).getTime() > Date.now();
    });

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <span>Curating our natural collection…</span>
    </div>
  );

  return (
    <motion.div
      className="products-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="products-hero">
        <div className="hero-tag">🌿 Natural Collection</div>
        <h1>Crafted by <em>Nature</em>,<br />Made for You</h1>
        <p>Thoughtfully sourced · Sustainably crafted · Kind to you and the planet</p>
      </div>

      <div className="products-toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="products-count">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </span>
      </div>

      <div className="product-grid">
        {filtered.length === 0 ? (
          <div className="no-results">
            <span className="no-results-icon">🌱</span>
            <p>No products found for "<strong>{searchQuery}</strong>"</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((product, index) => {
              const stock      = product.stock ?? 0;
              const ratingData = ratings[product.id];

              return (
                <motion.div
                  key={product.id}
                  className="product-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  onClick={() => navigate(`/products/${product.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <ProductCardWithTimer
                    product={product}
                    stock={stock}
                    ratingData={ratingData}
                    addToCart={addToCart}
                    navigate={navigate}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

/* ✅ NEW: Timer-enabled card (isolated change) */
function ProductCardWithTimer({ product, stock, ratingData, addToCart }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!product.expiresAt) return;

    const interval = setInterval(() => {
      const diff = new Date(product.expiresAt).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("");
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [product.expiresAt]);

  return (
    <>
      <div className="card-image">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && <div className="badge">{product.badge}</div>}
        <div className="wishlist-btn">
          <HeartButton productId={product.id} size={20} />
        </div>
      </div>

      <div className="card-content">
        <h3 className="product-name">{product.name}</h3>

        {ratingData ? (
          <div className="rating">
            <StarRating rating={ratingData.average} size={14} />
            <span className="rating-count">({ratingData.count})</span>
          </div>
        ) : (
          <div className="rating no-rating">No reviews yet</div>
        )}

        <div className="price-row">
          <span className="price">₹{product.price}</span>
          <span className={`stock ${stock > 0 ? "in-stock" : "out-stock"}`}>
            {stock > 0 ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* ✅ TIME LIMIT DISPLAY */}
        {timeLeft && (
          <div style={{
            marginTop: "6px",
            fontSize: "12px",
            color: "#b45309",
            fontWeight: "600"
          }}>
            ⏳ {timeLeft} left
          </div>
        )}

        <AddToCartBtn
          disabled={stock === 0}
          onAdd={e => { e.stopPropagation(); if (stock > 0) addToCart(product); }}
        />
      </div>
    </>
  );
}

/* ── ORIGINAL BUTTON (unchanged) ── */
function AddToCartBtn({ disabled, onAdd }) {
  const [state, setState] = useState("idle");
  const timerRef = useRef(null);

  const handleClick = (e) => {
    if (disabled || state !== "idle") return;
    onAdd(e);
    setState("adding");
    timerRef.current = setTimeout(() => {
      setState("added");
      timerRef.current = setTimeout(() => setState("idle"), 1800);
    }, 600);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      className={`add-to-cart${disabled ? " atc-disabled" : ""} atc-${state}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="atc-label">
        {disabled ? "Out of Stock" : state === "added" ? "Added!" : "Add to Cart"}
      </span>
    </button>
  );
}

export default Products;