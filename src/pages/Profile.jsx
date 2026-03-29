import { useEffect, useState, useRef, useContext } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";
import { useWishlist } from "../context/WishlistContext";
import { CartContext } from "../context/CartContext";
import HeartButton from "../components/HeartButton";

function Profile() {
  const [user, setUser]                   = useState(null);
  const [orders, setOrders]               = useState([]);
  const [cancellingId, setCancellingId]   = useState(null);
  const [confirmId, setConfirmId]         = useState(null);
  const [activeTab, setActiveTab]         = useState("orders");
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [wishlistLoading, setWishlistLoading]   = useState(false);

  const { wishlist }    = useWishlist();
  const { addToCart }   = useContext(CartContext);
  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  // ── Refs that must NOT trigger re-renders or re-subscriptions ──
  const unsubscribeSnapshotRef = useRef(null);
  const isFirstSnapshotRef     = useRef(true);

  /*
   * FIX: prevStatuses was useState → it was in the useEffect dep array →
   * every snapshot update re-ran the effect → created a NEW onSnapshot
   * listener every time → infinite loop + listener leak.
   *
   * useRef holds the value between renders without causing re-renders,
   * so it safely stays OUT of the dependency array.
   */
  const prevStatusesRef = useRef({});

  /* ── Auth + live orders ── */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { navigate("/login"); return; }

      setUser(currentUser);
      isFirstSnapshotRef.current = true;
      prevStatusesRef.current    = {};

      // Tear down any existing listener before creating a new one
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();

      const q = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const updated = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // On updates after the initial load, diff against prev statuses
        if (!isFirstSnapshotRef.current) {
          updated.forEach((order) => {
            const prev = prevStatusesRef.current[order.id];
            if (prev && prev !== order.status) {
              const messages = {
                Shipped:   "Your order has been shipped! 🚚",
                Delivered: "Your order has been delivered! 🎉",
                Cancelled: "Your order has been cancelled.",
              };
              const msg = messages[order.status];
              if (msg) toast(msg, order.status === "Cancelled" ? "warning" : "success");
            }
          });
        }

        // Write new statuses into the ref (no re-render, no dep-array issue)
        const statusMap = {};
        updated.forEach((o) => { statusMap[o.id] = o.status; });
        prevStatusesRef.current    = statusMap;
        isFirstSnapshotRef.current = false;

        setOrders(updated);
      });

      unsubscribeSnapshotRef.current = unsub;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, [navigate, toast]); // ← prevStatuses is gone from here

  /* ── Fetch wishlist product details whenever wishlist changes ── */
  useEffect(() => {
    if (!wishlist || wishlist.length === 0) {
      setWishlistProducts([]);
      return;
    }

    const fetchWishlistProducts = async () => {
      setWishlistLoading(true);
      try {
        const productDocs = await Promise.all(
          wishlist.map((pid) => getDoc(doc(db, "products", pid)))
        );
        setWishlistProducts(
          productDocs
            .filter((d) => d.exists())
            .map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Wishlist fetch error:", err);
      }
      setWishlistLoading(false);
    };

    fetchWishlistProducts();
  }, [wishlist]);

  /* ── Cancel order ── */
  const handleCancel = async (order) => {
    if (order.status !== "Pending") {
      toast("Only pending orders can be cancelled.", "warning");
      return;
    }
    setCancellingId(order.id);
    setConfirmId(null);
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "Cancelled" });
      for (const item of order.items || []) {
        const productRef  = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          await updateDoc(productRef, {
            stock: (productSnap.data().stock ?? 0) + item.quantity,
          });
        }
      }
      toast("Order cancelled. Stock restored. 🌿", "success");
    } catch (err) {
      console.error("Cancel error:", err);
      toast("Failed to cancel. Try again.", "error");
    }
    setCancellingId(null);
  };

  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  if (!user) return null;

  /* ── Render ── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: "40px", background: "#f4f6f8", minHeight: "100vh" }}
    >
      <ToastContainer />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>My Profile 👤</h1>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            Order status updates in real time
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      {/* User info */}
      <div style={styles.card}>
        <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>Logged in as</p>
        <p style={{ margin: "4px 0 0", fontWeight: "500" }}>{user.email}</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button
          onClick={() => setActiveTab("orders")}
          style={activeTab === "orders" ? styles.tabActive : styles.tab}
        >
          Order History 📦
          {orders.length > 0 && <span style={styles.tabBadge}>{orders.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          style={activeTab === "wishlist" ? styles.tabActive : styles.tab}
        >
          Wishlist 🤍
          {wishlist.length > 0 && <span style={styles.tabBadge}>{wishlist.length}</span>}
        </button>
      </div>

      {/* ══ TAB: Orders ══ */}
      {activeTab === "orders" && (
        orders.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: "#888" }}>You have no orders yet.</p>
            <button onClick={() => navigate("/products")} style={styles.shopBtn}>
              Start Shopping
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const isPending    = order.status === "Pending";
            const isCancelling = cancellingId === order.id;
            const showConfirm  = confirmId === order.id;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.orderCard}
              >
                <div style={styles.orderTop}>
                  <div>
                    <p style={{ margin: "0 0 4px" }}>
                      <strong>Total:</strong> ₹ {order.total}
                    </p>
                    <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                      {order.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <StatusBadge status={order.status || "Pending"} />
                    {isPending && (
                      <button
                        onClick={() => setConfirmId(showConfirm ? null : order.id)}
                        disabled={isCancelling}
                        style={styles.cancelBtn}
                      >
                        {isCancelling ? "Cancelling..." : "Cancel Order"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirm panel */}
                <AnimatePresence>
                  {showConfirm && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={styles.confirmBox}>
                        <p style={{ margin: "0 0 8px", fontWeight: "500" }}>Cancel this order?</p>
                        <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#666" }}>
                          Stock will be restored. This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={() => handleCancel(order)} style={styles.confirmYes}>
                            Yes, cancel it
                          </button>
                          <button onClick={() => setConfirmId(null)} style={styles.confirmNo}>
                            Keep order
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Items */}
                <div style={{ marginTop: "14px" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: "500", fontSize: "14px" }}>Items</p>
                  {order.items?.map((item, idx) => (
                    <div key={idx} style={styles.itemRow}>
                      <span>{item.name}</span>
                      <span style={{ color: "#888" }}>× {item.quantity}</span>
                      <span style={{ marginLeft: "auto", color: "#2E7D32", fontWeight: "500" }}>
                        ₹ {item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Shipping */}
                <div style={styles.shippingBox}>
                  <p style={{ margin: "0 0 4px", fontWeight: "500", fontSize: "13px" }}>
                    Shipping address
                  </p>
                  <p style={styles.shippingText}>{order.shipping?.fullName}</p>
                  <p style={styles.shippingText}>{order.shipping?.address}</p>
                  <p style={styles.shippingText}>
                    {order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pin}
                  </p>
                </div>
              </motion.div>
            );
          })
        )
      )}

      {/* ══ TAB: Wishlist ══ */}
      {activeTab === "wishlist" && (
        wishlistLoading ? (
          <p style={{ color: "#aaa", marginTop: "20px" }}>Loading wishlist...</p>
        ) : wishlistProducts.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: "#888" }}>Your wishlist is empty.</p>
            <button onClick={() => navigate("/products")} style={styles.shopBtn}>
              Browse Products
            </button>
          </div>
        ) : (
          <div style={styles.wishlistGrid}>
            {wishlistProducts.map((product) => {
              const stock = product.stock ?? 0;
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={styles.wishlistCard}
                >
                  <div
                    style={{ position: "relative", cursor: "pointer" }}
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        objectFit: "cover",
                        borderRadius: "10px",
                        display: "block",
                      }}
                    />
                    <div style={{ position: "absolute", top: "8px", right: "8px" }}>
                      <HeartButton
                        productId={product.id}
                        size={20}
                        style={{
                          background: "rgba(255,255,255,0.9)",
                          borderRadius: "50%",
                          padding: "5px",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: "12px 4px 4px" }}>
                    <h4
                      style={{ margin: "0 0 4px", fontSize: "14px", cursor: "pointer" }}
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.name}
                    </h4>
                    <p style={{ margin: "0 0 10px", color: "#2E7D32", fontWeight: "bold", fontSize: "14px" }}>
                      ₹ {product.price}
                    </p>
                    <button
                      onClick={() => {
                        if (stock > 0) {
                          addToCart(product);
                          toast(`${product.name} added to cart 🛒`, "success");
                        }
                      }}
                      disabled={stock === 0}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: stock === 0 ? "#eee" : "#4CAF50",
                        color: stock === 0 ? "#aaa" : "white",
                        border: "none",
                        borderRadius: "7px",
                        cursor: stock === 0 ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                      }}
                    >
                      {stock === 0 ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </motion.div>
  );
}

/* ── Styles ── */
const styles = {
  header:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  liveIndicator: { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#4CAF50", marginTop: "6px", fontWeight: "500" },
  liveDot:       { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#4CAF50", animation: "pulse 1.8s ease-in-out infinite" },
  logoutBtn:     { padding: "8px 16px", background: "#f44336", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" },
  card:          { background: "#fff", padding: "18px 20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  tabRow:        { display: "flex", gap: "8px", margin: "28px 0 20px" },
  tab:           { padding: "10px 20px", background: "#fff", border: "1.5px solid #ddd", borderRadius: "25px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#555", display: "flex", alignItems: "center", gap: "6px" },
  tabActive:     { padding: "10px 20px", background: "#2E7D32", border: "1.5px solid #2E7D32", borderRadius: "25px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#fff", display: "flex", alignItems: "center", gap: "6px" },
  tabBadge:      { background: "rgba(255,255,255,0.25)", borderRadius: "10px", padding: "1px 7px", fontSize: "12px" },
  emptyState:    { textAlign: "center", padding: "60px 0" },
  shopBtn:       { marginTop: "12px", padding: "10px 24px", background: "#4CAF50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px" },
  orderCard:     { background: "#fff", padding: "20px", marginBottom: "16px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  orderTop:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" },
  cancelBtn:     { padding: "6px 14px", background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" },
  confirmBox:    { marginTop: "14px", padding: "16px", background: "#fff8f8", border: "1px solid #ffcdd2", borderRadius: "10px" },
  confirmYes:    { padding: "8px 18px", background: "#f44336", color: "white", border: "none", borderRadius: "7px", cursor: "pointer", fontWeight: "500", fontSize: "14px" },
  confirmNo:     { padding: "8px 18px", background: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "7px", cursor: "pointer", fontSize: "14px" },
  itemRow:       { display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: "14px" },
  shippingBox:   { marginTop: "14px", background: "#f9f9f9", padding: "12px 14px", borderRadius: "8px" },
  shippingText:  { margin: "2px 0", fontSize: "13px", color: "#555" },
  wishlistGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" },
  wishlistCard:  { background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", overflow: "hidden", padding: "10px" },
};

export default Profile;