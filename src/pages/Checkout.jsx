import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import "./Cart.css";
import "./Checkout.css";

/* ─────────────────────────────────────────────
   Staged loading messages
───────────────────────────────────────────── */
const STAGES = [
  { label: "Processing payment…",    duration: 900 },
  { label: "Confirming your order…", duration: 800 },
  { label: "Finalizing details…",    duration: 600 },
];

/* ─────────────────────────────────────────────
   Delivery form fields config
───────────────────────────────────────────── */
const FIELDS = [
  { key: "fullName", label: "Full Name",      placeholder: "Your Name",      span: "full", type: "text" },
  { key: "phone",    label: "Phone Number",   placeholder: "Phone Number",   span: "",     type: "tel"  },
  { key: "pin",      label: "PIN Code",       placeholder: "PIN Code",       span: "",     type: "text" },
  { key: "address",  label: "Street Address", placeholder: "Street Address", span: "full", type: "text" },
  { key: "city",     label: "City",           placeholder: "City",           span: "",     type: "text" },
  { key: "state",    label: "State",          placeholder: "State",          span: "",     type: "text" },
];

/* ─────────────────────────────────────────────
   CHECKOUT
───────────────────────────────────────────── */
const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState({});
  const [stageIdx,  setStageIdx]  = useState(0);   // which progress stage we're on
  const [stageMsg,  setStageMsg]  = useState("");   // currently displayed stage message
  const [orderSnap, setOrderSnap] = useState(null); // optimistic snapshot of cart
  const [form, setForm] = useState({
    fullName: "", address: "", city: "", state: "", pin: "", phone: "",
  });

  const stageTimers = useRef([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  /* clean up stage timers on unmount */
  useEffect(() => {
    return () => stageTimers.current.forEach(clearTimeout);
  }, []);

  const totalPrice = cart?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  /* ── Empty cart ── */
  if (!cart || (cart.length === 0 && !submitted && !loading)) {
    return (
      <div className="checkout-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">📦</div>
          <h2>Nothing to checkout</h2>
          <p>Your cart is empty.</p>
          <Link to="/products" className="btn-checkout" style={{ width: "auto", padding: "13px 36px", marginTop: "8px" }}>
            Browse Products 🌿
          </Link>
        </div>
      </div>
    );
  }

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    FIELDS.forEach((f) => { if (!form[f.key].trim()) e[f.key] = "Required"; });
    if (form.phone && !/^\+?[0-9\s-]{7,15}$/.test(form.phone)) e.phone = "Invalid phone number";
    if (form.pin   && !/^\d{4,10}$/.test(form.pin))             e.pin   = "Invalid PIN code";
    return e;
  };

  /* ── Kick off staged progress animation ── */
  const runStages = () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];

    let elapsed = 0;
    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => {
        setStageIdx(i);
        setStageMsg(stage.label);
      }, elapsed);
      stageTimers.current.push(t);
      elapsed += stage.duration;
    });
    return elapsed; // total animation time
  };

  /* ── Place order ── */
  const handleOrder = async () => {
    if (!user) { navigate("/login"); return; }
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    // ── Optimistic snapshot ──
    // Capture cart now so we can display it even after clearCart()
    const snapshot = cart.map((i) => ({ ...i }));
    setOrderSnap(snapshot);
    setLoading(true);
    setStageIdx(0);

    const totalStageTime = runStages();

    try {
      await runTransaction(db, async (transaction) => {
        const productData = [];
        for (const item of cart) {
          const ref  = doc(db, "products", item.id);
          const snap = await transaction.get(ref);
          if (!snap.exists()) throw new Error(`${item.name} not found`);
          const stock = snap.data().stock ?? 0;
          if (item.quantity > stock) throw new Error(`Not enough stock for ${item.name}`);
          productData.push({ ref, stock, quantity: item.quantity });
        }
        transaction.set(doc(collection(db, "orders")), {
          userId:    user.uid,
          userEmail: user.email,
          items:     cart,
          total:     totalPrice,
          shipping:  form,
          status:    "Pending",
          createdAt: serverTimestamp(),
        });
        productData.forEach((p) =>
          transaction.update(p.ref, { stock: p.stock - p.quantity })
        );
      });

      clearCart();

      // Wait for stages to finish visually before showing success
      const remaining = Math.max(totalStageTime - 200, 0);
      stageTimers.current.push(
        setTimeout(() => {
          setLoading(false);
          setSubmitted(true);
        }, remaining)
      );
    } catch (err) {
      // ── Rollback ──
      stageTimers.current.forEach(clearTimeout);
      setLoading(false);
      setOrderSnap(null);
      alert(`Order failed: ${err.message}`);
    }
  };

  /* ─────────────────────────────────────────────
     PROGRESS / LOADING STATE
  ───────────────────────────────────────────── */
  if (loading && orderSnap) {
    return (
      <motion.div
        className="checkout-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="checkout-hero">
          <div className="checkout-hero-tag">📦 Checkout</div>
          <h1>Placing Your Order</h1>
          <p>Please wait while we confirm everything</p>
        </div>

        <div className="checkout-layout">
          {/* Optimistic order preview */}
          <div className="checkout-card">
            <div className="checkout-card-head">
              <span className="checkout-card-icon">🧺</span>
              <h2 className="checkout-card-title">Your Order</h2>
            </div>
            <div className="checkout-items">
              {orderSnap.map((item) => (
                <motion.div
                  key={item.id}
                  className="checkout-mini-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <img className="checkout-mini-img" src={item.image} alt={item.name} />
                  <span className="checkout-mini-name">{item.name} × {item.quantity}</span>
                  <span className="checkout-mini-price">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="checkout-totals">
              <div className="checkout-total-row big">
                <span>Total</span>
                <span>₹{orderSnap.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Staged progress UI */}
          <div className="checkout-card">
            <div className="checkout-card-head" style={{ borderBottom: "none" }}>
              <span className="checkout-card-icon">⚙️</span>
              <h2 className="checkout-card-title">Processing</h2>
            </div>
            <div style={{ padding: "0 28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Progress bar */}
              <div className="co-progress-track">
                <motion.div
                  className="co-progress-fill"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>

              {/* Stage messages */}
              <div className="co-stages">
                {STAGES.map((stage, i) => (
                  <div
                    key={i}
                    className={`co-stage ${i < stageIdx ? "done" : i === stageIdx ? "active" : "pending"}`}
                  >
                    <span className="co-stage-dot">
                      {i < stageIdx ? "✓" : i === stageIdx ? <SpinnerDot /> : "○"}
                    </span>
                    <span className="co-stage-label">{stage.label}</span>
                  </div>
                ))}
              </div>

              {/* Current stage message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={stageMsg}
                  className="co-current-msg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {stageMsg || STAGES[0].label}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ─────────────────────────────────────────────
     SUCCESS STATE
  ───────────────────────────────────────────── */
  if (submitted) {
    return (
      <motion.div
        className="checkout-page"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="checkout-success">
          <motion.div
            className="checkout-success-ring"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            🌿
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            Order Confirmed!
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            Thank you for choosing ECOFY. Your eco-friendly order is on its way 🚚
          </motion.p>

          {/* Summary of what was ordered */}
          {orderSnap && (
            <motion.div
              className="success-order-summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              {orderSnap.map((item) => (
                <div key={item.id} className="success-item">
                  <img src={item.image} alt={item.name} />
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="success-total">
                Total: ₹{orderSnap.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}
              </div>
            </motion.div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <Link to="/profile" className="btn-checkout" style={{ width: "auto", padding: "13px 28px" }}>
              View Orders →
            </Link>
            <Link to="/" className="btn-continue" style={{ width: "auto", padding: "13px 28px" }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ─────────────────────────────────────────────
     NORMAL FORM STATE
  ───────────────────────────────────────────── */
  return (
    <motion.div
      className="checkout-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="checkout-hero">
        <div className="checkout-hero-tag">📦 Checkout</div>
        <h1>Complete Your Order</h1>
        <p>Just one step away from greener living</p>
      </div>

      <div className="checkout-layout">
        {/* ── Delivery form ── */}
        <div className="checkout-card">
          <div className="checkout-card-head">
            <span className="checkout-card-icon">📦</span>
            <h2 className="checkout-card-title">Delivery Details</h2>
          </div>
          <div className="checkout-fields">
            {FIELDS.map((f) => (
              <div key={f.key} className={`checkout-field${f.span === "full" ? " full" : ""}`}>
                <label className="checkout-label">{f.label}</label>
                <input
                  className="checkout-input"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                    setErrors((prev) => ({ ...prev, [f.key]: "" }));
                  }}
                  style={errors[f.key] ? { borderColor: "#c0392b" } : {}}
                />
                {errors[f.key] && (
                  <span style={{ fontSize: "0.73rem", color: "#c0392b", marginTop: 2 }}>
                    {errors[f.key]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Order review ── */}
        <div className="checkout-card">
          <div className="checkout-card-head">
            <span className="checkout-card-icon">🧺</span>
            <h2 className="checkout-card-title">Order Review</h2>
          </div>
          <div className="checkout-items">
            {cart.map((item) => (
              <div key={item.id} className="checkout-mini-item">
                <img className="checkout-mini-img" src={item.image} alt={item.name} />
                <span className="checkout-mini-name">{item.name} × {item.quantity}</span>
                <span className="checkout-mini-price">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="checkout-totals">
            <div className="checkout-total-row">
              <span style={{ color: "var(--tm)" }}>Subtotal</span>
              <span>₹{totalPrice.toLocaleString()}</span>
            </div>
            <div className="checkout-total-row">
              <span style={{ color: "var(--tm)" }}>Delivery</span>
              <span style={{ color: "var(--gf)", fontWeight: 600 }}>FREE 🌿</span>
            </div>
            <div className="checkout-total-row big">
              <span>Total</span>
              <span>₹{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          <div className="checkout-submit">
            <button
              className="btn-place-order"
              onClick={handleOrder}
              disabled={loading}
            >
              Place Order →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* tiny inline spinner dot */
function SpinnerDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10, height: 10,
        borderRadius: "50%",
        border: "2px solid #2e7d32",
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

export default Checkout;