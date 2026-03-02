import { useEffect, useState, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import "./Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useContext(CartContext);

  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(list);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

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
        {products.map((product, index) => (
          <motion.div
            className="product-card"
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p>₹ {product.price}</p>
            <button onClick={() => addToCart(product)}>
              Add to Cart
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default Products;