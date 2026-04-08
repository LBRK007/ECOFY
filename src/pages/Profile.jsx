import { useEffect, useState, useRef, useContext,  } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
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
import { SkeletonProductCard, SkeletonOrderCard } from "../components/Skeleton";

import "./Profile.css";

/* ─────────────────────────────────────────────
   Tab transitions
───────────────────────────────────────────── */
const tabVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

/* ─────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────── */
function Profile() {
  const [user,           setUser]           = useState(null);
  const [orders,         setOrders]         = useState([]);
  const [ordersLoading,  setOrdersLoading]  = useState(true);
  const [cancellingId,   setCancellingId]   = useState(null);
  const [activeTab,      setActiveTab]      = useState("profile");
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);

  // edit fields
  const [editName,    setEditName]    = useState("");
  const [editPhone,   setEditPhone]   = useState("");
  const [editAddress, setEditAddress] = useState("");

  const { wishlist, loading: wishlistCtxLoading } = useWishlist();
  const { addToCart }          = useContext(CartContext);
  const { toast, ToastContainer } = useToast();
  const navigate               = useNavigate();

  // Wishlist products state
  const [wishlistProducts, setWishlistProducts]   = useState([]);
  const [wishlistFetching, setWishlistFetching]   = useState(false);
  const [wishlistError,    setWishlistError]      = useState(false);

  const unsubscribeSnapshotRef = useRef(null);
  const isFirstSnapshotRef     = useRef(true);
  const prevStatusesRef        = useRef({});

  /* ── Auth + real-time orders ── */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { navigate("/login"); return; }

      setUser(currentUser);
      setEditName(currentUser.displayName || currentUser.email.split("@")[0]);
      setEditPhone(currentUser.phoneNumber || "");

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) setEditAddress(snap.data().address || "");
      } catch {}

      // Real-time orders
      isFirstSnapshotRef.current = true;
      prevStatusesRef.current    = {};
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();

      setOrdersLoading(true);
      const q = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribeSnapshotRef.current = onSnapshot(
  q,
  (snapshot) => {
    const updated = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Status-change toasts (skip first load)
    if (!isFirstSnapshotRef.current) {
      updated.forEach((order) => {
        const prev = prevStatusesRef.current[order.id];
        if (prev && prev !== order.status) {
          const msgs = {
            Shipped:   "Your order has been shipped! 🚚",
            Delivered: "Your order has been delivered! 🎉",
            Cancelled: "Your order has been cancelled.",
          };
          const msg = msgs[order.status];
          if (msg) toast(msg, order.status === "Cancelled" ? "warning" : "success");
        }
      });
    }

    const statusMap = {};
    updated.forEach((o) => (statusMap[o.id] = o.status));
    prevStatusesRef.current    = statusMap;
    isFirstSnapshotRef.current = false;

    setOrders(updated);
    setOrdersLoading(false);
  },
  (error) => {
    console.error("Orders snapshot error:", error); // 🔥 Logs the full Firestore error
    setOrdersLoading(false);
    toast("Could not load orders.", "error");
  }
);
    });

    return () => {
      unsubAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, [navigate, toast]);

  /* ── Fetch wishlist products whenever wishlist IDs change ── */
  useEffect(() => {
    // Don't run while auth/wishlist context is still loading
    if (wishlistCtxLoading) return;

    if (wishlist.length === 0) {
      setWishlistProducts([]);
      setWishlistFetching(false);
      setWishlistError(false);
      return;
    }

    let cancelled = false;
    setWishlistFetching(true);
    setWishlistError(false);

    const fetchProducts = async () => {
      try {
        const docs = await Promise.all(
          wishlist.map((pid) => getDoc(doc(db, "products", pid)))
        );
        if (cancelled) return;
        const products = docs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() }));
        setWishlistProducts(products);
      } catch {
        if (!cancelled) {
          setWishlistError(true);
          toast("Failed to load wishlist products.", "error");
        }
      } finally {
        if (!cancelled) setWishlistFetching(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [wishlist, wishlistCtxLoading, toast]);

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: editName });
      await updateDoc(doc(db, "users", user.uid), {
        phone: editPhone,
        address: editAddress,
        updatedAt: new Date(),
      });
      setUser((prev) => ({ ...prev, displayName: editName }));
      toast("Profile updated! ✅", "success");
      setShowEditModal(false);
    } catch {
      toast("Failed to update profile.", "error");
    }
  };

  /* ── Cancel order ── */
  const handleCancel = async (order) => {
    if (order.status !== "Pending") {
      toast("Only pending orders can be cancelled.", "warning");
      return;
    }
    setCancellingId(order.id);
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "Cancelled" });
      for (const item of order.items || []) {
        const ref  = doc(db, "products", item.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, { stock: (snap.data().stock ?? 0) + item.quantity });
        }
      }
      toast("Order cancelled. Stock restored.", "success");
    } catch {
      toast("Failed to cancel order.", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!user) return null;

  const avatarInitial = (user.displayName || user.email || "U")[0].toUpperCase();

  return (
    <motion.div
      className="ecofy-profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <ToastContainer />

      <div className="profile-wrapper">
        {/* ── Sidebar ── */}
        <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="brand">ECOFY</div>

          <div className="user-section">
            <div className="avatar-large" onClick={() => setShowEditModal(true)}>
              {avatarInitial}
            </div>
            <h2>{user.displayName || "Welcome"}</h2>
            <p>{user.email}</p>
          </div>

          <nav className="nav-menu">
            {[
              { key: "profile",  label: "👤 Personal Information" },
              { key: "orders",   label: "📦 Order History" },
              { key: "wishlist", label: "🤍 My Wishlist" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setIsSidebarOpen(false); }}
                className={`nav-item ${activeTab === key ? "active" : ""}`}
              >
                {label}
                {key === "wishlist" && wishlist.length > 0 && (
                  <span style={badgePill}>{wishlist.length}</span>
                )}
              </button>
            ))}
          </nav>

          <button onClick={handleLogout} className="signout-btn">Logout</button>
        </div>

        {/* ── Main ── */}
        <div className="main-content">
          <button
            className="hamburger-btn"
            onClick={() => setIsSidebarOpen((v) => !v)}
          >☰</button>

          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div key="profile" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <ProfileTab
                  user={user}
                  editPhone={editPhone}
                  editAddress={editAddress}
                  onEdit={() => setShowEditModal(true)}
                />
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div key="orders" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <OrdersTab
                  orders={orders}
                  loading={ordersLoading}
                  cancellingId={cancellingId}
                  onCancel={handleCancel}
                  onShop={() => navigate("/products")}
                />
              </motion.div>
            )}

            {activeTab === "wishlist" && (
              <motion.div key="wishlist" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <WishlistTab
                  wishlistProducts={wishlistProducts}
                  wishlistIds={wishlist}
                  loading={wishlistCtxLoading || wishlistFetching}
                  error={wishlistError}
                  addToCart={addToCart}
                  onShop={() => navigate("/products")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <h3>Edit Personal Information</h3>
              <input type="text"  value={editName}    onChange={(e) => setEditName(e.target.value)}    placeholder="Full Name" />
              <input type="tel"   value={editPhone}   onChange={(e) => setEditPhone(e.target.value)}   placeholder="Phone Number" />
              <input type="text"  value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Delivery Address" />
              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="save"   onClick={handleSaveProfile}>Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Sub-tabs
───────────────────────────────────────────── */

function ProfileTab({ user, editPhone, editAddress, onEdit }) {
  return (
    <div className="personal-info-section">
      <div className="header">
        <h1>Personal Information</h1>
        <p className="subtitle">Manage your contact details and address.</p>
      </div>
      <div className="info-grid">
        {[
          { icon: "👤", label: "Name",    value: user.displayName || "Not provided" },
          { icon: "✉️", label: "Email",   value: user.email },
          { icon: "📱", label: "Phone",   value: editPhone   || "Not added yet" },
          { icon: "📍", label: "Address", value: editAddress || "No address saved" },
        ].map(({ icon, label, value }) => (
          <div key={label} className="info-card">
            <div className="card-icon">{icon}</div>
            <h3>{label}</h3>
            <p>{value}</p>
          </div>
        ))}
      </div>
      <button onClick={onEdit} className="edit-btn">Edit</button>
    </div>
  );
}

/* ── Orders tab with skeleton loaders ── */

function OrdersTab({ orders, loading, cancellingId, onCancel, onShop }) {
  // Loading skeletons
  if (loading) {
    return (
      <div>
        <div className="header" style={{ marginBottom: 24 }}>
          <h1>Order History</h1>
        </div>
        {[0, 1, 2].map((i) => (
          <SkeletonOrderCard key={i} />
        ))}
      </div>
    );
  }

  // No orders
  if (orders.length === 0) {
    return (
      <div>
        <div className="header" style={{ marginBottom: 24 }}>
          <h1>Order History</h1>
        </div>
        <div className="empty-state">
          <p>You have no orders yet.</p>
          <button onClick={onShop} className="shop-btn">
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  // Render orders
  return (
    <div>
      <div className="header" style={{ marginBottom: 24 }}>
        <h1>Order History</h1>
        <p className="subtitle">
          {orders.length} {orders.length === 1 ? "order" : "orders"} found
        </p>
      </div>

      <AnimatePresence>
        {orders.map((order) => (
          <motion.div
            key={order.id}
            className="order-card"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            {/* Order header */}
            <div className="order-header">
              <div>
                <div className="total">
                  ₹{order.total?.toLocaleString("en-IN") || "0"}
                </div>
                <div className="date">
                  {order.createdAt?.toDate
                    ? order.createdAt
                        .toDate()
                        .toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                    : "—"}
                </div>
              </div>
              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Order items */}
            <div className="order-items">
              {order.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="order-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: 50,
                      height: 50,
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <span>{item.name} × {item.quantity}</span>
                  </div>
                  <div>
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            {/* Cancel button */}
            {order.status === "Pending" && (
              <button
                onClick={() => onCancel(order)}
                disabled={cancellingId === order.id}
                className="cancel-btn"
              >
                {cancellingId === order.id ? "Cancelling…" : "Cancel Order"}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Wishlist tab with optimistic skeletons ── */
function WishlistTab({ wishlistProducts, wishlistIds, loading, error, addToCart, onShop }) {
  // While wishlist context or product data is loading, show skeletons
  // Skeleton count matches known wishlist IDs so layout doesn't jump
  const skeletonCount = Math.max(wishlistIds.length, 1);

  if (loading) {
    return (
      <div>
        <div className="header" style={{ marginBottom: 24 }}>
          <h1>My Wishlist</h1>
          <p className="subtitle">Loading your saved items…</p>
        </div>
        <div className="wishlist-grid">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="header" style={{ marginBottom: 24 }}>
          <h1>My Wishlist</h1>
        </div>
        <div className="empty-state">
          <p>Could not load wishlist items. Please try again.</p>
          <button onClick={() => window.location.reload()} className="shop-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (wishlistIds.length === 0) {
    return (
      <div>
        <div className="header" style={{ marginBottom: 24 }}>
          <h1>My Wishlist</h1>
        </div>
        <div className="empty-state">
          <p>Your wishlist is empty.</p>
          <button onClick={onShop} className="shop-btn">Browse Products</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header" style={{ marginBottom: 24 }}>
        <h1>My Wishlist</h1>
        <p className="subtitle">{wishlistIds.length} saved {wishlistIds.length === 1 ? "item" : "items"}</p>
      </div>
      <div className="wishlist-grid">
        <AnimatePresence>
          {wishlistProducts.map((product) => {
            const stock = product.stock ?? 0;
            return (
              <motion.div
                key={product.id}
                className="product-card"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <div className="card-image">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <div className="heart-wrapper">
                    <HeartButton productId={product.id} size={24} />
                  </div>
                </div>
                <div className="card-content">
                  <h3>{product.name}</h3>
                  <p className="price">₹{product.price?.toLocaleString()}</p>
                  <button
                    onClick={() => stock > 0 && addToCart(product)}
                    disabled={stock === 0}
                    className="add-to-cart-btn"
                  >
                    {stock > 0 ? "Add to Cart" : "Out of Stock"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* tiny badge pill */
const badgePill = {
  marginLeft: "auto",
  background: "#2e7d32",
  color: "#fff",
  borderRadius: "10px",
  padding: "1px 8px",
  fontSize: "11px",
  fontWeight: 700,
};

export default Profile;