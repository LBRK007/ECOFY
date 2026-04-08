import { useEffect, useState, useRef, useContext } from "react";
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

import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);   // ← Added for mobile menu

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const { wishlist } = useWishlist();
  const { addToCart } = useContext(CartContext);
  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  const unsubscribeSnapshotRef = useRef(null);
  const isFirstSnapshotRef = useRef(true);
  const prevStatusesRef = useRef({});

  /* ── Auth Listener + Real-time Orders ── */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);
      setEditName(currentUser.displayName || currentUser.email.split("@")[0]);
      setEditPhone(currentUser.phoneNumber || "");

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setEditAddress(data.address || "");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }

      isFirstSnapshotRef.current = true;
      prevStatusesRef.current = {};

      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();

      const q = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const updated = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (!isFirstSnapshotRef.current) {
          updated.forEach((order) => {
            const prev = prevStatusesRef.current[order.id];
            if (prev && prev !== order.status) {
              const messages = {
                Shipped: "Your order has been shipped! 🚚",
                Delivered: "Your order has been delivered! 🎉",
                Cancelled: "Your order has been cancelled.",
              };
              const msg = messages[order.status];
              if (msg) {
                toast(msg, order.status === "Cancelled" ? "warning" : "success");
              }
            }
          });
        }

        const statusMap = {};
        updated.forEach((o) => (statusMap[o.id] = o.status));
        prevStatusesRef.current = statusMap;
        isFirstSnapshotRef.current = false;

        setOrders(updated);
      });

      unsubscribeSnapshotRef.current = unsub;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, [navigate, toast]);

  /* ── Fetch Wishlist Products ── */
  useEffect(() => {
    if (wishlist.length === 0) {
      setWishlistProducts([]);
      return;
    }

    const fetchWishlistProducts = async () => {
      setWishlistLoading(true);
      try {
        const productDocs = await Promise.all(
          wishlist.map((pid) => getDoc(doc(db, "products", pid)))
        );
        const products = productDocs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() }));
        setWishlistProducts(products);
      } catch (err) {
        console.error("Wishlist fetch error:", err);
      }
      setWishlistLoading(false);
    };

    fetchWishlistProducts();
  }, [wishlist]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await updateProfile(user, { displayName: editName });

      await updateDoc(doc(db, "users", user.uid), {
        phone: editPhone,
        address: editAddress,
        updatedAt: new Date(),
      });

      setUser({ ...user, displayName: editName });
      toast("Profile updated successfully!", "success");
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      toast("Failed to update profile. Please try again.", "error");
    }
  };

  const handleCancel = async (order) => {
    if (order.status !== "Pending") {
      toast("Only pending orders can be cancelled.", "warning");
      return;
    }

    setCancellingId(order.id);

    try {
      await updateDoc(doc(db, "orders", order.id), { status: "Cancelled" });

      for (const item of order.items || []) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          await updateDoc(productRef, {
            stock: (productSnap.data().stock ?? 0) + item.quantity,
          });
        }
      }
      toast("Order cancelled successfully. Stock restored.", "success");
    } catch (err) {
      toast("Failed to cancel order.", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  if (!user) return null;

  const avatarInitial = (user.displayName || user.email || "U")[0].toUpperCase();

  return (
    <motion.div className="ecofy-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ToastContainer />

      <div className="profile-wrapper">
        {/* Sidebar - Now properly responsive with hamburger */}
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
            <button
              onClick={() => { setActiveTab("profile"); closeSidebar(); }}
              className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            >
              👤 Personal Information
            </button>
            <button
              onClick={() => { setActiveTab("orders"); closeSidebar(); }}
              className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
            >
              📦 Order History
            </button>
            <button
              onClick={() => { setActiveTab("wishlist"); closeSidebar(); }}
              className={`nav-item ${activeTab === "wishlist" ? "active" : ""}`}
            >
              🤍 My Wishlist
            </button>
          </nav>

          <button onClick={handleLogout} className="signout-btn">
            Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Hamburger Button - Visible only on mobile */}
          <button 
            className="hamburger-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>

          {/* Personal Information Tab */}
          {activeTab === "profile" && (
            <div className="personal-info-section">
              <div className="header">
                <h1>Personal Information</h1>
                <p className="subtitle">
                  Manage your personal information, including contact details and address.
                </p>
              </div>

              <div className="info-grid">
                <div className="info-card">
                  <div className="card-icon">👤</div>
                  <h3>Name</h3>
                  <p>{user.displayName || "Not provided"}</p>
                </div>

                <div className="info-card">
                  <div className="card-icon">✉️</div>
                  <h3>Email</h3>
                  <p>{user.email}</p>
                </div>

                <div className="info-card">
                  <div className="card-icon">📱</div>
                  <h3>Phone</h3>
                  <p>{editPhone || "Not added yet"}</p>
                </div>

                <div className="info-card">
                  <div className="card-icon">📍</div>
                  <h3>Address</h3>
                  <p>{editAddress || "No address saved"}</p>
                </div>
              </div>

              <button onClick={() => setShowEditModal(true)} className="edit-btn">
                Edit
              </button>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" &&
            (orders.length === 0 ? (
              <div className="empty-state">
                <p>You have no orders yet.</p>
                <button onClick={() => navigate("/products")} className="shop-btn">
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <motion.div key={order.id} className="order-card" layout>
                  <div className="order-header">
                    <div>
                      <div className="total">₹{order.total?.toLocaleString("en-IN") || "0"}</div>
                      <div className="date">
                        {order.createdAt?.toDate().toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <StatusBadge status={order.status || "Pending"} />
                  </div>

                  <div className="order-items">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span>{item.name} × {item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>

                  {order.status === "Pending" && (
                    <button
                      onClick={() => handleCancel(order)}
                      disabled={cancellingId === order.id}
                      className="cancel-btn"
                    >
                      {cancellingId === order.id ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </motion.div>
              ))
            ))}

          {/* Wishlist Tab */}
          {activeTab === "wishlist" &&
            (wishlistLoading ? (
              <div className="empty-state">
                <p>Loading your wishlist...</p>
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="empty-state">
                <p>Your wishlist is empty.</p>
                <button onClick={() => navigate("/products")} className="shop-btn">
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="wishlist-grid">
                {wishlistProducts.map((product) => {
                  const stock = product.stock ?? 0;
                  return (
                    <motion.div key={product.id} className="product-card" layout>
                      <div className="card-image">
                        <img src={product.image} alt={product.name} />
                        <div className="heart-wrapper">
                          <HeartButton productId={product.id} size={24} />
                        </div>
                      </div>
                      <div className="card-content">
                        <h3>{product.name}</h3>
                        <p className="price">₹{product.price}</p>
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
              </div>
            ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3>Edit Personal Information</h3>

              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full Name"
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone Number"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Delivery Address"
              />

              <div className="modal-actions">
                <button onClick={() => setShowEditModal(false)} className="cancel">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} className="save">
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Profile;