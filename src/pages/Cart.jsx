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
  getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Cart() {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🏠 Shipping Info State
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setStateValue] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");

  const navigate = useNavigate();

  const {
    cart,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart
  } = useContext(CartContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleOrder = async () => {

    if (!user) {
      alert("Please login to place order 🌿");
      navigate("/login");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty 🛒");
      return;
    }

    if (!fullName || !address || !city || !state || !pin || !phone) {
      alert("Please fill shipping details 📦");
      return;
    }

    try {
      setLoading(true);

      const productData = [];

      // 🔍 Validate Stock
      for (let item of cart) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          alert(`${item.name} no longer exists`);
          setLoading(false);
          return;
        }

        const currentStock = productSnap.data().stock ?? 0;

        if (item.quantity > currentStock) {
          alert(`Only ${currentStock} left for ${item.name}`);
          setLoading(false);
          return;
        }

        productData.push({
          ref: productRef,
          stock: currentStock,
          quantity: item.quantity
        });
      }

      // 📝 Create Order with Address
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        items: cart,
        total: totalPrice,
        status: "Pending",
        shipping: {
          fullName,
          address,
          city,
          state,
          pin,
          phone
        },
        createdAt: Timestamp.now()
      });

      // 📉 Reduce Stock
      for (let product of productData) {
        await updateDoc(product.ref, {
          stock: product.stock - product.quantity
        });
      }

      alert("Order placed successfully 🌿");

      clearCart();
      navigate("/");

    } catch (error) {
      console.error("Order error:", error);
      alert("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{ padding: "50px" }}
    >
      <h1>Your Cart 🛒</h1>

      {cart.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} style={{
  marginBottom: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
}}>
              <h3>{item.name}</h3>
              <p>₹ {item.price}</p>
              <p>Qty: {item.quantity}</p>

              <button onClick={() => decreaseQty(item.id)}>-</button>
              <button onClick={() => increaseQty(item.id)}>+</button>
              <button onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </div>
          ))}

          <h2>Total: ₹ {totalPrice}</h2>

          {/* 🏠 Shipping Form */}
          <h2 style={{ marginTop: "30px" }}>Shipping Details 📦</h2>

          <input placeholder="Full Name" onChange={(e) => setFullName(e.target.value)} />
          <input placeholder="Address" onChange={(e) => setAddress(e.target.value)} />
          <input placeholder="City" onChange={(e) => setCity(e.target.value)} />
          <input placeholder="State" onChange={(e) => setStateValue(e.target.value)} />
          <input placeholder="PIN Code" onChange={(e) => setPin(e.target.value)} />
          <input placeholder="Phone Number" onChange={(e) => setPhone(e.target.value)} />

          <button
            onClick={handleOrder}
            disabled={loading}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </>
      )}
    </motion.div>
  );
}

export default Cart;