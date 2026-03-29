import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";

function Cart() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  /* FIX: all inputs are now controlled (value + onChange) */
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setStateValue] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");

  const { cart, increaseQty, decreaseQty, removeItem, clearCart } =
    useContext(CartContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleOrder = async () => {
    if (!user) {
      toast("Please login to place an order 🌿", "warning");
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      toast("Your cart is empty 🛒", "warning");
      return;
    }
    if (!fullName || !address || !city || !state || !pin || !phone) {
      toast("Please fill in all shipping details 📦", "warning");
      return;
    }

    try {
      setLoading(true);
      const productData = [];

      for (let item of cart) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          toast(`${item.name} no longer exists`, "error");
          setLoading(false);
          return;
        }

        const currentStock = productSnap.data().stock ?? 0;
        if (item.quantity > currentStock) {
          toast(`Only ${currentStock} left for ${item.name}`, "error");
          setLoading(false);
          return;
        }

        productData.push({ ref: productRef, stock: currentStock, quantity: item.quantity });
      }

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        items: cart,
        total: totalPrice,
        status: "Pending",
        shipping: { fullName, address, city, state, pin, phone },
        createdAt: Timestamp.now(),
      });

      for (let product of productData) {
        await updateDoc(product.ref, {
          stock: product.stock - product.quantity,
        });
      }

      toast("Order placed successfully 🌿", "success");
      clearCart();
      navigate("/");
    } catch (error) {
      console.error("Order error:", error);
      toast("Something went wrong. Please try again.", "error");
    }

    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}
    >
      <ToastContainer />
      <h1 style={{ color: "#2E7D32", marginBottom: "30px" }}>Your Cart 🛒</h1>

      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
          <p style={{ fontSize: "18px" }}>Your cart is empty</p>
          <button onClick={() => navigate("/products")} style={btnGreen}>
            Browse Products
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div style={{ marginBottom: "30px" }}>
            {cart.map((item) => (
              <div key={item.id} style={cartItemStyle}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px" }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px" }}>{item.name}</h3>
                  <p style={{ margin: 0, color: "#2E7D32", fontWeight: "bold" }}>
                    ₹ {item.price}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => decreaseQty(item.id)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: "24px", textAlign: "center", fontWeight: "500" }}>
                    {item.quantity}
                  </span>
                  <button onClick={() => increaseQty(item.id)} style={qtyBtn}>+</button>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ ...qtyBtn, background: "#fdecea", color: "#c62828", marginLeft: "6px" }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ textAlign: "right", minWidth: "80px" }}>
                  <strong>₹ {item.price * item.quantity}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={totalBar}>
            <span>Total</span>
            <span style={{ fontWeight: "bold", fontSize: "20px" }}>₹ {totalPrice}</span>
          </div>

          {/* Shipping Form */}
          <div style={formCard}>
            <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>Shipping Details 📦</h2>
            <div style={formGrid}>
              <input style={inputStyle} placeholder="Full Name" value={fullName}
                onChange={(e) => setFullName(e.target.value)} />
              <input style={inputStyle} placeholder="Phone Number" value={phone}
                onChange={(e) => setPhone(e.target.value)} />
              <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="Street Address"
                value={address} onChange={(e) => setAddress(e.target.value)} />
              <input style={inputStyle} placeholder="City" value={city}
                onChange={(e) => setCity(e.target.value)} />
              <input style={inputStyle} placeholder="State" value={state}
                onChange={(e) => setStateValue(e.target.value)} />
              <input style={inputStyle} placeholder="PIN Code" value={pin}
                onChange={(e) => setPin(e.target.value)} />
            </div>
          </div>

          <button onClick={handleOrder} disabled={loading} style={btnGreen}>
            {loading ? "Placing Order..." : "Place Order 🌿"}
          </button>
        </>
      )}
    </motion.div>
  );
}

const cartItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  background: "#fff",
  borderRadius: "12px",
  marginBottom: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const qtyBtn = {
  width: "30px",
  height: "30px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  background: "#f5f5f5",
  cursor: "pointer",
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const totalBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "#f0f7f0",
  borderRadius: "10px",
  marginBottom: "30px",
  fontSize: "18px",
};

const formCard = {
  background: "#fff",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  marginBottom: "24px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const inputStyle = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "15px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const btnGreen = {
  padding: "13px 28px",
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  width: "100%",
};

export default Cart;