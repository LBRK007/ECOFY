import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{
        textAlign: "center",
        padding: "100px 20px",
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FAFAFA",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "20px", color: "#2E7D32" }}>
        Welcome to ECOFY 🌿
      </h1>
      <p style={{ fontSize: "1.25rem", color: "#555", marginBottom: "40px" }}>
        Pure Nature. Pure Living.
      </p>

      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "#43A047" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/products")}
        style={{
          padding: "12px 30px",
          backgroundColor: "#4CAF50",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: "600",
          transition: "background-color 0.3s",
        }}
        aria-label="Shop Ecofy Products"
      >
        Shop Now
      </motion.button>
    </motion.div>
  );
}

export default Home;