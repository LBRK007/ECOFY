import { useEffect, useState, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));

        const list = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(list);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="products-container">
        <h2>Loading products...</h2>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="products-container">
        <h2>No products available 🌿</h2>
      </div>
    );
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

      <div className="product-grid">
        {products.map((product, index) => {
          const stock = product.stock ?? 0;

          return (
            <motion.div
              key={product.id}
              className="product-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate(`/products/${product.id}`)}
              style={{ cursor: "pointer" }}
            >
              <img src={product.image} alt={product.name} />

              <h3>{product.name}</h3>
              <p className="price">₹ {product.price}</p>

              <p
                className={`stock-text ${
                  stock > 0 ? "in-stock" : "out-stock"
                }`}
              >
                {stock > 0 ? `In Stock: ${stock}` : "Out of Stock"}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // 🔥 prevent navigation
                  if (stock > 0) addToCart(product);
                }}
                disabled={stock === 0}
                className={stock === 0 ? "disabled-btn" : ""}
              >
                {stock > 0 ? "Add to Cart" : "Out of Stock"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default Products;