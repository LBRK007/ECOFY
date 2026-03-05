import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return <h2 style={{ padding: "50px" }}>Loading product...</h2>;
  }

  if (!product) {
    return <h2 style={{ padding: "50px" }}>Product not found ❌</h2>;
  }

  const stock = product.stock ?? 0;

  return (
    <motion.div
      style={{
        display: "flex",
        gap: "60px",
        padding: "60px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Image Section */}
      <img
        src={product.image}
        alt={product.name}
        style={{
          width: "400px",
          borderRadius: "15px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
        }}
      />

      {/* Details Section */}
      <div style={{ maxWidth: "500px" }}>
        <h1>{product.name}</h1>

        <h2 style={{ color: "green", marginTop: "10px" }}>
          ₹ {product.price}
        </h2>

        <p style={{ marginTop: "20px", lineHeight: "1.6" }}>
          {product.description || 
            "100% natural and eco-friendly product made with love 🌿"}
        </p>

        {/* Stock Info */}
        <p
          style={{
            marginTop: "20px",
            fontWeight: "bold",
            color: stock > 5 ? "green" : stock > 0 ? "orange" : "red"
          }}
        >
          {stock > 5
            ? `In Stock (${stock})`
            : stock > 0
            ? `Only ${stock} left ⚠`
            : "Out of Stock ❌"}
        </p>

        {/* Buttons */}
        <div style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
          
          <button
            onClick={() => addToCart(product)}
            disabled={stock === 0}
            style={{
              padding: "12px 25px",
              backgroundColor: stock === 0 ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: stock === 0 ? "not-allowed" : "pointer",
              fontSize: "16px"
            }}
          >
            {stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>

          {stock > 0 && (
            <button
              onClick={() => {
                addToCart(product);
                navigate("/cart");
              }}
              style={{
                padding: "12px 25px",
                backgroundColor: "#000",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ProductDetails;