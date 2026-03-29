import { useEffect, useState, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import StarRating from "../components/StarRating";
import HeartButton from "../components/HeartButton";
import "./Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const productSnap = await getDocs(collection(db, "products"));
        const list = productSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(list);

        // Fetch all reviews in one shot, group by productId
        const reviewSnap = await getDocs(collection(db, "reviews"));
        const grouped = {};
        reviewSnap.docs.forEach((d) => {
          const { productId, rating } = d.data();
          if (!grouped[productId]) grouped[productId] = [];
          grouped[productId].push(rating);
        });
        const ratingMap = {};
        Object.entries(grouped).forEach(([pid, ratingList]) => {
          ratingMap[pid] = {
            average: ratingList.reduce((s, r) => s + r, 0) / ratingList.length,
            count: ratingList.length,
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

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="products-container"><h2>Loading products...</h2></div>;
  }

  return (
    <motion.div
      className="products-container"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.5 }}
    >
      <h1>Our Natural Products 🌿</h1>

      {/* Search */}
      <div style={{ maxWidth: "420px", margin: "0 auto 30px" }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 18px",
            borderRadius: "25px",
            border: "1.5px solid #c8e6c9",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(46,125,50,0.08)",
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", marginTop: "40px" }}>
          No products match "{searchQuery}"
        </p>
      ) : (
        <div className="product-grid">
          {filtered.map((product, index) => {
            const stock = product.stock ?? 0;
            const productRating = ratings[product.id];

            return (
              <motion.div
                key={product.id}
                className="product-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate(`/products/${product.id}`)}
                style={{ cursor: "pointer", position: "relative" }}
              >
                {/* ── Heart button — top-right of the image ── */}
                <div style={{ position: "relative" }}>
                  <img src={product.image} alt={product.name} />
                  <div style={{ position: "absolute", top: "8px", right: "8px" }}>
                    <HeartButton
                      productId={product.id}
                      size={22}
                      style={{
                        background: "rgba(255,255,255,0.85)",
                        borderRadius: "50%",
                        padding: "5px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                      }}
                    />
                  </div>
                </div>

                <h3>{product.name}</h3>
                <p className="price">₹ {product.price}</p>

                {/* Rating */}
                {productRating ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center", margin: "4px 0" }}>
                    <StarRating rating={productRating.average} size={14} />
                    <span style={{ fontSize: "12px", color: "#888" }}>({productRating.count})</span>
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "#ccc", margin: "4px 0" }}>No reviews yet</p>
                )}

                <p className={`stock-text ${stock > 0 ? "in-stock" : "out-stock"}`}>
                  {stock > 0 ? `In Stock: ${stock}` : "Out of Stock"}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (stock > 0) addToCart(product);
                  }}
                  disabled={stock === 0}
                >
                  {stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default Products;  