import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Cart() {

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const { cart, increaseQty, decreaseQty, removeItem } =
    useContext(CartContext);

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // 🔐 Protected Order Function
  const handleOrder = async () => {

    if (!user) {
      alert("Please login to place order 🌿");
      navigate("/login");
      return;
    }

    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        items: cart,
        total: totalPrice,
        createdAt: Timestamp.now()
      });

      alert("Order placed successfully 🌿");

      localStorage.removeItem("ecofyCart");
      window.location.reload();

    } catch (error) {
      console.error(error);
      alert("Error placing order");
    }
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
            <div key={item.id} style={{ marginBottom: "20px" }}>
              <h3>{item.name}</h3>
              <p>₹ {item.price}</p>

              <button onClick={() => decreaseQty(item.id)}>-</button>
              <span style={{ margin: "0 10px" }}>
                {item.quantity}
              </span>
              <button onClick={() => increaseQty(item.id)}>+</button>

              <button
                onClick={() => removeItem(item.id)}
                style={{
                  marginLeft: "15px",
                  backgroundColor: "#c62828",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                Remove
              </button>
            </div>
          ))}

          <h2>Total: ₹ {totalPrice}</h2>

          {/* 🛒 Place Order Button */}
          <button
            onClick={handleOrder}
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
            Place Order
          </button>
        </>
      )}
    </motion.div>
  );
}

export default Cart;