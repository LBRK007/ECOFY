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
   WhatsApp
───────────────────────────────────────────── */

// WhatsApp number with country code.
// India = 91
// Do NOT use +, spaces or hyphens.
const WHATSAPP_NUMBER = "918547244140";

/* ─────────────────────────────────────────────
   Staged loading messages
───────────────────────────────────────────── */

const STAGES = [
  {
    label: "Processing order…",
    duration: 900,
  },
  {
    label: "Confirming your order…",
    duration: 800,
  },
  {
    label: "Finalizing details…",
    duration: 600,
  },
];

/* ─────────────────────────────────────────────
   Delivery form fields
───────────────────────────────────────────── */

const FIELDS = [
  {
    key: "fullName",
    label: "Full Name",
    placeholder: "Your Name",
    span: "full",
    type: "text",
  },
  {
    key: "phone",
    label: "Phone Number",
    placeholder: "Phone Number",
    span: "",
    type: "tel",
  },
  {
    key: "pin",
    label: "PIN Code",
    placeholder: "PIN Code",
    span: "",
    type: "text",
  },
  {
    key: "address",
    label: "Street Address",
    placeholder: "Street Address",
    span: "full",
    type: "text",
  },
  {
    key: "city",
    label: "City",
    placeholder: "City",
    span: "",
    type: "text",
  },
  {
    key: "state",
    label: "State",
    placeholder: "State",
    span: "",
    type: "text",
  },
];

/* ─────────────────────────────────────────────
   CHECKOUT
───────────────────────────────────────────── */

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [stageIdx, setStageIdx] = useState(0);
  const [stageMsg, setStageMsg] = useState("");

  // Snapshot of cart before clearing it
  const [orderSnap, setOrderSnap] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    address: "",
    city: "",
    state: "",
    pin: "",
    phone: "",
  });

  const stageTimers = useRef([]);

  /* ─────────────────────────────────────────────
     AUTH
  ───────────────────────────────────────────── */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);

    return () => unsubscribe();
  }, []);

  /* ─────────────────────────────────────────────
     CLEANUP TIMERS
  ───────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      stageTimers.current.forEach(clearTimeout);
    };
  }, []);

  /* ─────────────────────────────────────────────
     TOTAL PRICE
  ───────────────────────────────────────────── */

  const totalPrice =
    cart?.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0) ?? 0;

  /* ─────────────────────────────────────────────
     SEND ORDER TO WHATSAPP
  ───────────────────────────────────────────── */

  const sendOrderToWhatsApp = (orderItems, total, shipping) => {
    const itemsText = orderItems
      .map((item) => {
        const itemTotal =
          Number(item.price) * Number(item.quantity);

        return `• ${item.name} × ${item.quantity} = ₹${itemTotal.toLocaleString()}`;
      })
      .join("\n");

    const message = `
🌿 NEW ECOFY ORDER

👤 CUSTOMER DETAILS
━━━━━━━━━━━━━━━━━━
Name: ${shipping.fullName}
Phone: ${shipping.phone}

📍 DELIVERY ADDRESS
━━━━━━━━━━━━━━━━━━
${shipping.address}
${shipping.city}, ${shipping.state}
PIN: ${shipping.pin}

🛒 ORDER DETAILS
━━━━━━━━━━━━━━━━━━
${itemsText}

💰 TOTAL
━━━━━━━━━━━━━━━━━━
₹${Number(total).toLocaleString()}

📦 STATUS: Pending

Thank you for shopping with ECOFY 🌿
    `.trim();

    // Correct WhatsApp URL
    const whatsappUrl =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");
  };

  /* ─────────────────────────────────────────────
     EMPTY CART
  ───────────────────────────────────────────── */

  if (
    !cart ||
    (cart.length === 0 && !submitted && !loading)
  ) {
    return (
      <div className="checkout-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">📦</div>

          <h2>Nothing to checkout</h2>

          <p>Your cart is empty.</p>

          <Link
            to="/products"
            className="btn-checkout"
            style={{
              width: "auto",
              padding: "13px 36px",
              marginTop: "8px",
            }}
          >
            Browse Products 🌿
          </Link>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     VALIDATION
  ───────────────────────────────────────────── */

  const validate = () => {
    const validationErrors = {};

    FIELDS.forEach((field) => {
      if (!form[field.key].trim()) {
        validationErrors[field.key] = "Required";
      }
    });

    // Phone validation
    if (
      form.phone &&
      !/^\+?[0-9\s-]{7,15}$/.test(form.phone)
    ) {
      validationErrors.phone = "Invalid phone number";
    }

    // PIN validation
    if (
      form.pin &&
      !/^\d{4,10}$/.test(form.pin)
    ) {
      validationErrors.pin = "Invalid PIN code";
    }

    return validationErrors;
  };

  /* ─────────────────────────────────────────────
     STAGED PROGRESS ANIMATION
  ───────────────────────────────────────────── */

  const runStages = () => {
    // Clear old timers
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];

    let elapsed = 0;

    STAGES.forEach((stage, index) => {
      const timer = setTimeout(() => {
        setStageIdx(index);
        setStageMsg(stage.label);
      }, elapsed);

      stageTimers.current.push(timer);

      elapsed += stage.duration;
    });

    return elapsed;
  };

  /* ─────────────────────────────────────────────
     PLACE ORDER
  ───────────────────────────────────────────── */

  const handleOrder = async () => {
    /* ─────────────────────────────────────────
       Check login
    ───────────────────────────────────────── */

    if (!user) {
      navigate("/login");
      return;
    }

    /* ─────────────────────────────────────────
       Validate form
    ───────────────────────────────────────── */

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    /* ─────────────────────────────────────────
       Snapshot cart
    ───────────────────────────────────────── */

    const snapshot = cart.map((item) => ({
      ...item,
    }));

    setOrderSnap(snapshot);

    setLoading(true);
    setStageIdx(0);
    setStageMsg(STAGES[0].label);

    const totalStageTime = runStages();

    try {
      /* ─────────────────────────────────────────
         FIREBASE TRANSACTION
      ───────────────────────────────────────── */

      await runTransaction(db, async (transaction) => {
        const productData = [];

        /* ─────────────────────────────────────
           Check stock
        ───────────────────────────────────── */

        for (const item of cart) {
          const productRef = doc(
            db,
            "products",
            item.id
          );

          const productSnap =
            await transaction.get(productRef);

          if (!productSnap.exists()) {
            throw new Error(
              `${item.name} not found`
            );
          }

          const stock =
            productSnap.data().stock ?? 0;

          if (item.quantity > stock) {
            throw new Error(
              `Not enough stock for ${item.name}`
            );
          }

          productData.push({
            ref: productRef,
            stock,
            quantity: item.quantity,
          });
        }

        /* ─────────────────────────────────────
           Create order
        ───────────────────────────────────── */

        const orderRef = doc(
          collection(db, "orders")
        );

        transaction.set(orderRef, {
          userId: user.uid,
          userEmail: user.email,

          items: cart,

          total: totalPrice,

          shipping: {
            fullName: form.fullName,
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: form.state,
            pin: form.pin,
          },

          status: "Pending",

          createdAt: serverTimestamp(),
        });

        /* ─────────────────────────────────────
           Reduce stock
        ───────────────────────────────────── */

        productData.forEach((product) => {
          transaction.update(product.ref, {
            stock:
              product.stock - product.quantity,
          });
        });
      });

      /* ─────────────────────────────────────────
         FIREBASE SUCCESS
      ───────────────────────────────────────── */

      // Clear cart
      clearCart();

      /* ─────────────────────────────────────────
         SEND TO WHATSAPP
      ───────────────────────────────────────── */

      sendOrderToWhatsApp(
        snapshot,
        totalPrice,
        form
      );

      /* ─────────────────────────────────────────
         FINISH LOADING ANIMATION
      ───────────────────────────────────────── */

      const remaining = Math.max(
        totalStageTime - 200,
        0
      );

      stageTimers.current.push(
        setTimeout(() => {
          setLoading(false);
          setSubmitted(true);
        }, remaining)
      );
    } catch (error) {
      /* ─────────────────────────────────────────
         ORDER FAILED
      ───────────────────────────────────────── */

      stageTimers.current.forEach(clearTimeout);

      setLoading(false);
      setOrderSnap(null);

      alert(
        `Order failed: ${error.message}`
      );
    }
  };

  /* ─────────────────────────────────────────────
     LOADING / PROGRESS STATE
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
          <div className="checkout-hero-tag">
            📦 Checkout
          </div>

          <h1>Placing Your Order</h1>

          <p>
            Please wait while we confirm everything
          </p>
        </div>

        <div className="checkout-layout">

          {/* ORDER PREVIEW */}

          <div className="checkout-card">
            <div className="checkout-card-head">
              <span className="checkout-card-icon">
                🧺
              </span>

              <h2 className="checkout-card-title">
                Your Order
              </h2>
            </div>

            <div className="checkout-items">
              {orderSnap.map((item) => (
                <motion.div
                  key={item.id}
                  className="checkout-mini-item"
                  initial={{
                    opacity: 0,
                    x: -10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    duration: 0.28,
                  }}
                >
                  <img
                    className="checkout-mini-img"
                    src={item.image}
                    alt={item.name}
                  />

                  <span className="checkout-mini-name">
                    {item.name} × {item.quantity}
                  </span>

                  <span className="checkout-mini-price">
                    ₹
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="checkout-totals">
              <div className="checkout-total-row big">
                <span>Total</span>

                <span>
                  ₹
                  {orderSnap
                    .reduce(
                      (sum, item) =>
                        sum +
                        Number(item.price) *
                          Number(item.quantity),
                      0
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* PROCESSING */}

          <div className="checkout-card">

            <div
              className="checkout-card-head"
              style={{
                borderBottom: "none",
              }}
            >
              <span className="checkout-card-icon">
                ⚙️
              </span>

              <h2 className="checkout-card-title">
                Processing
              </h2>
            </div>

            <div
              style={{
                padding: "0 28px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >

              {/* PROGRESS BAR */}

              <div className="co-progress-track">
                <motion.div
                  className="co-progress-fill"
                  initial={{
                    width: "0%",
                  }}
                  animate={{
                    width: `${
                      ((stageIdx + 1) /
                        STAGES.length) *
                      100
                    }%`,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                  }}
                />
              </div>

              {/* STAGES */}

              <div className="co-stages">
                {STAGES.map(
                  (stage, index) => (
                    <div
                      key={index}
                      className={`co-stage ${
                        index < stageIdx
                          ? "done"
                          : index === stageIdx
                          ? "active"
                          : "pending"
                      }`}
                    >
                      <span className="co-stage-dot">
                        {index < stageIdx
                          ? "✓"
                          : index === stageIdx
                          ? <SpinnerDot />
                          : "○"}
                      </span>

                      <span className="co-stage-label">
                        {stage.label}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* CURRENT MESSAGE */}

              <AnimatePresence mode="wait">
                <motion.p
                  key={stageMsg}
                  className="co-current-msg"
                  initial={{
                    opacity: 0,
                    y: 6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -6,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
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
        initial={{
          opacity: 0,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.4,
        }}
      >
        <div className="checkout-success">

          <motion.div
            className="checkout-success-ring"
            initial={{
              scale: 0.5,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 200,
            }}
          >
            🌿
          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
          >
            Order Confirmed!
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.35,
            }}
          >
            Thank you for choosing ECOFY.
            Your eco-friendly order is on its way 🚚
          </motion.p>

          {/* ORDER SUMMARY */}

          {orderSnap && (
            <motion.div
              className="success-order-summary"
              initial={{
                opacity: 0,
                y: 16,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.45,
              }}
            >
              {orderSnap.map((item) => (
                <div
                  key={item.id}
                  className="success-item"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                  />

                  <span>
                    {item.name} ×{" "}
                    {item.quantity}
                  </span>

                  <span>
                    ₹
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toLocaleString()}
                  </span>
                </div>
              ))}

              <div className="success-total">
                Total: ₹
                {orderSnap
                  .reduce(
                    (sum, item) =>
                      sum +
                      Number(item.price) *
                        Number(item.quantity),
                    0
                  )
                  .toLocaleString()}
              </div>
            </motion.div>
          )}

          {/* BUTTONS */}

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <Link
              to="/profile"
              className="btn-checkout"
              style={{
                width: "auto",
                padding: "13px 28px",
              }}
            >
              View Orders →
            </Link>

            <Link
              to="/"
              className="btn-continue"
              style={{
                width: "auto",
                padding: "13px 28px",
              }}
            >
              Continue Shopping
            </Link>
          </div>

        </div>
      </motion.div>
    );
  }

  /* ─────────────────────────────────────────────
     NORMAL CHECKOUT FORM
  ───────────────────────────────────────────── */

  return (
    <motion.div
      className="checkout-page"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.35,
      }}
    >

      {/* HERO */}

      <div className="checkout-hero">

        <div className="checkout-hero-tag">
          📦 Checkout
        </div>

        <h1>
          Complete Your Order
        </h1>

        <p>
          Just one step away from greener living
        </p>

      </div>

      <div className="checkout-layout">

        {/* ─────────────────────────────────────
            DELIVERY FORM
        ───────────────────────────────────── */}

        <div className="checkout-card">

          <div className="checkout-card-head">

            <span className="checkout-card-icon">
              📦
            </span>

            <h2 className="checkout-card-title">
              Delivery Details
            </h2>

          </div>

          <div className="checkout-fields">

            {FIELDS.map((field) => (

              <div
                key={field.key}
                className={`checkout-field${
                  field.span === "full"
                    ? " full"
                    : ""
                }`}
              >

                <label className="checkout-label">
                  {field.label}
                </label>

                <input
                  className="checkout-input"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(event) => {

                    setForm((prev) => ({
                      ...prev,
                      [field.key]:
                        event.target.value,
                    }));

                    setErrors((prev) => ({
                      ...prev,
                      [field.key]: "",
                    }));
                  }}
                  style={
                    errors[field.key]
                      ? {
                          borderColor:
                            "#c0392b",
                        }
                      : {}
                  }
                />

                {errors[field.key] && (
                  <span
                    style={{
                      fontSize: "0.73rem",
                      color: "#c0392b",
                      marginTop: 2,
                    }}
                  >
                    {errors[field.key]}
                  </span>
                )}

              </div>

            ))}

          </div>

        </div>

        {/* ─────────────────────────────────────
            ORDER REVIEW
        ───────────────────────────────────── */}

        <div className="checkout-card">

          <div className="checkout-card-head">

            <span className="checkout-card-icon">
              🧺
            </span>

            <h2 className="checkout-card-title">
              Order Review
            </h2>

          </div>

          <div className="checkout-items">

            {cart.map((item) => (

              <div
                key={item.id}
                className="checkout-mini-item"
              >

                <img
                  className="checkout-mini-img"
                  src={item.image}
                  alt={item.name}
                />

                <span className="checkout-mini-name">
                  {item.name} × {item.quantity}
                </span>

                <span className="checkout-mini-price">
                  ₹
                  {(
                    Number(item.price) *
                    Number(item.quantity)
                  ).toLocaleString()}
                </span>

              </div>

            ))}

          </div>

          <div className="checkout-totals">

            <div className="checkout-total-row">

              <span
                style={{
                  color: "var(--tm)",
                }}
              >
                Subtotal
              </span>

              <span>
                ₹{totalPrice.toLocaleString()}
              </span>

            </div>

            <div className="checkout-total-row">

              <span
                style={{
                  color: "var(--tm)",
                }}
              >
                Delivery
              </span>

              <span
                style={{
                  color: "var(--gf)",
                  fontWeight: 600,
                }}
              >
                FREE 🌿
              </span>

            </div>

            <div className="checkout-total-row big">

              <span>
                Total
              </span>

              <span>
                ₹{totalPrice.toLocaleString()}
              </span>

            </div>

          </div>

          <div className="checkout-submit">

            <button
              className="btn-place-order"
              onClick={handleOrder}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Place Order →"}
            </button>

          </div>

        </div>

      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   TINY INLINE SPINNER
───────────────────────────────────────────── */

function SpinnerDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: "2px solid #2e7d32",
        borderTopColor: "transparent",
        animation:
          "spin 0.7s linear infinite",
      }}
    />
  );
}

export default Checkout;