import { useEffect, useState, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import StarRating from "../components/StarRating";
import HeartButton from "../components/HeartButton";
import "./Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const productSnap = await getDocs(collection(db, "products"));
        const list = productSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(list);

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
    return (
      <div className="products-container">
        <div className="loading">Curating our natural collection...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="products-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="header">
        <h1>Our Natural Collection</h1>
        <p className="subtitle">Thoughtfully sourced • Sustainably crafted • Kind to you and the planet</p>
      </div>

      <div className="search-wrapper">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="no-results">No products found for "{searchQuery}"</p>
      ) : (
        <div className="product-grid">
          {filtered.map((product, index) => {
            const stock = product.stock ?? 0;
            const ratingData = ratings[product.id];

            return (
              <motion.div
                key={product.id}
                className="product-card"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8 }}
              >
                <div className="card-image">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    loading="lazy"
                  />

                  {/* Badges */}
                  {product.badge && (
                    <div className="badge">{product.badge}</div>
                  )}

                  {/* Wishlist */}
                  <div className="wishlist-btn">
                    <HeartButton productId={product.id} size={22} />
                  </div>

                  {/* Hover Overlay */}
                  <div className="card-overlay">
                    <button 
                      className="quick-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (stock > 0) addToCart(product);
                      }}
                      disabled={stock === 0}
                    >
                      {stock > 0 ? "Add to Cart" : "Out of Stock"}
                    </button>
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="product-name">{product.name}</h3>
                  
                  {ratingData ? (
                    <div className="rating">
                      <StarRating rating={ratingData.average} size={15} />
                      <span className="rating-count">({ratingData.count})</span>
                    </div>
                  ) : (
                    <div className="rating no-rating">No reviews yet</div>
                  )}

                  <div className="price-row">
                    <span className="price">₹{product.price}</span>
                    {stock > 0 ? (
                      <span className="stock in-stock">In stock</span>
                    ) : (
                      <span className="stock out-stock">Out of stock</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default Products;