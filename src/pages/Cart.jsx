import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import "./Cart.css";

const Cart = () => {
  const { cart, increaseQty, decreaseQty, removeItem } = useCart();

  const totalPrice = cart?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const totalItems = cart?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  if (!cart || cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <h2>Your bag is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <Link to="/products" className="btn-checkout" style={{ width: "auto", padding: "13px 36px", marginTop: "8px" }}>
            Browse Products 🌿
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="cart-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Hero ── */}
      <div className="cart-hero">
        <div className="cart-hero-tag">🛒 Your Cart</div>
        <h1>Shopping Bag</h1>
        <p>{totalItems} {totalItems === 1 ? "item" : "items"} · ready to checkout</p>
      </div>

      {/* ── Layout ── */}
      <div className="cart-layout">

        {/* ── Items ── */}
        <div className="cart-section">
          <div className="cart-section-head">
            <h2 className="cart-section-title">Items</h2>
            <span className="cart-count">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
          </div>

          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.id}
                className="cart-item"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0, padding: 0 }}
                transition={{ duration: 0.28 }}
                layout
              >
                <img className="cart-item-img" src={item.image} alt={item.name} />

                <div className="cart-item-body">
                  <div className="cart-item-top">
                    <div>
                      <p className="cart-item-name">{item.name}</p>
                      <p className="cart-item-price">₹{item.price.toLocaleString()} each</p>
                    </div>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <div className="cart-item-footer">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => decreaseQty(item.id)} disabled={item.quantity <= 1}>−</button>
                      <span className="qty-num">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => increaseQty(item.id)}>+</button>
                    </div>
                    <span className="cart-item-subtotal">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Summary ── */}
        <div className="order-summary">
          <div className="summary-head">
            <h2 className="summary-title">Order Summary</h2>
          </div>

          <div className="summary-rows">
            <div className="summary-row">
              <span className="summary-row-label">Subtotal ({totalItems} items)</span>
              <span className="summary-row-val">₹{totalPrice.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">Delivery</span>
              <span className="summary-free">FREE</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">Eco packaging</span>
              <span className="summary-free">Included 🌿</span>
            </div>
          </div>

          <div className="summary-divider" />

          <div className="summary-total">
            <span className="summary-total-label">Total</span>
            <span className="summary-total-val">₹{totalPrice.toLocaleString()}</span>
          </div>

          <div className="summary-cta">
            <Link to="/checkout" className="btn-checkout">Proceed to Checkout →</Link>
            <Link to="/products" className="btn-continue">Continue Shopping</Link>
          </div>

          <div className="summary-trust">
            <span className="trust-item">🔒 Secure</span>
            <span className="trust-item">♻️ Eco-packed</span>
            <span className="trust-item">↩️ Easy returns</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Cart;