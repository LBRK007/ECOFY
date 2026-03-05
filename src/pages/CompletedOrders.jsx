import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function CompletedOrders() {

  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const ADMIN_EMAIL = "irfanmk@gmail.com";

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user || user.email !== ADMIN_EMAIL) {
        navigate("/");
        return;
      }

      const q = query(
        collection(db, "orders"),
        where("status", "==", "Delivered")
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(list);
    });

    return () => unsubscribe();

  }, [navigate]);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Completed Orders ✅</h1>

      {orders.length === 0 ? (
        <p>No completed orders.</p>
      ) : (
        orders.map(order => (
          <div key={order.id} style={{
            background: "#fff",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "10px"
          }}>
            <p><strong>User:</strong> {order.userEmail}</p>
            <p><strong>Total:</strong> ₹ {order.total}</p>
            <p><strong>Status:</strong> {order.status}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default CompletedOrders;
