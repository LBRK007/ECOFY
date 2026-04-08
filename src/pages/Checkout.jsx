import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, serverTimestamp, runTransaction,} from "firebase/firestore";
import "./Cart.css";

const FIELDS = [
  { key: "fullName", label: "Full Name",       placeholder: "Your Name",         span: "full", type: "text" },
  { key: "phone",    label: "Phone Number",    placeholder: "Phone Number",   span: "",     type: "tel"  },
  { key: "pin",      label: "PIN Code",        placeholder: "PIN Code",            span: "",     type: "text" },
  { key: "address",  label: "Street Address",  placeholder: "Street Address",     span: "full", type: "text" },
  { key: "city",     label: "City",            placeholder: "City",         span: "",     type: "text" },
  { key: "state",    label: "State",           placeholder: "State",         span: "",     type: "text" },
];

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState({});
  const [form,      setForm]      = useState({
    fullName: "", address: "", city: "", state: "", pin: "", phone: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const totalPrice = cart?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  /* ── Empty ── */
  if (!cart || (cart.length === 0 && !submitted)) return (
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

  /* ── Success ── */
  if (submitted) return (
    <motion.div
      className="checkout-page"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="checkout-success">
        <div className="checkout-success-ring">🌿</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for choosing ECOFY. Your eco-friendly order is on its way.</p>
        <Link to="/" className="btn-checkout" style={{ width: "auto", padding: "13px 36px", marginTop: "8px" }}>
          Continue Shopping
        </Link>
      </div>
    </motion.div>
  );

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    FIELDS.forEach(f => { if (!form[f.key].trim()) e[f.key] = "Required"; });
    if (form.phone && !/^\+?[0-9\s-]{7,15}$/.test(form.phone)) e.phone = "Invalid phone number";
    if (form.pin   && !/^\d{4,10}$/.test(form.pin))             e.pin   = "Invalid PIN code";
    return e;
  };

  const handleOrder = async () => {
    if (!user) { navigate("/login"); return; }
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const productData = [];
        for (let item of cart) {
          const ref  = doc(db, "products", item.id);
          const snap = await transaction.get(ref);
          if (!snap.exists()) throw new Error(`${item.name} not found`);
          const stock = snap.data().stock ?? 0;
          if (item.quantity > stock) throw new Error(`Not enough stock for ${item.name}`);
          productData.push({ ref, stock, quantity: item.quantity });
        }
        transaction.set(doc(collection(db, "orders")), {
          userId: user.uid,
          userEmail: user.email, // <-- add this
          items: cart,
          total: totalPrice,
          shipping: form,
          status: "Pending",     // for user display
          createdAt: serverTimestamp(),
        });
        productData.forEach(p => transaction.update(p.ref, { stock: p.stock - p.quantity }));
      });
      clearCart();
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="checkout-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Hero ── */}
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
            {FIELDS.map(f => (
              <div key={f.key} className={`checkout-field${f.span === "full" ? " full" : ""}`}>
                <label className="checkout-label">{f.label}</label>
                <input
                  className="checkout-input"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => {
                    setForm(prev => ({ ...prev, [f.key]: e.target.value }));
                    setErrors(prev => ({ ...prev, [f.key]: "" }));
                  }}
                  style={errors[f.key] ? { borderColor: "#c0392b" } : {}}
                />
                {errors[f.key] && (
                  <span style={{ fontSize: "0.73rem", color: "#c0392b", marginTop: "2px" }}>
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
            {cart.map(item => (
              <div key={item.id} className="checkout-mini-item">
                <img className="checkout-mini-img" src={item.image} alt={item.name} />
                <span className="checkout-mini-name">{item.name} × {item.quantity}</span>
                <span className="checkout-mini-price">₹{(item.price * item.quantity).toLocaleString()}</span>
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
            <button className="btn-place-order" onClick={handleOrder} disabled={loading}>
              {loading ? "🌿 Placing Order…" : "Place Order →"}
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default Checkout;