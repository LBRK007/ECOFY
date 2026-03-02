import { motion } from "framer-motion";

function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{ textAlign: "center", padding: "100px 20px" }}
    >
      <h1>Welcome to ECOFY 🌿</h1>
      <p>Pure Nature. Pure Living.</p>

      <button
        style={{
          padding: "10px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginTop: "20px",
          transition: "0.3s"
        }}
        onMouseEnter={(e) =>
          (e.target.style.backgroundColor = "#43A047")
        }
        onMouseLeave={(e) =>
          (e.target.style.backgroundColor = "#4CAF50")
        }
      >
        Shop Now
      </button>
    </motion.div>
  );
}

export default Home;