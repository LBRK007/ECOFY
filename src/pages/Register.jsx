import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_EMAIL } from "../constants";
import "./Register.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: user.email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: new Date()
      });

      setMessage("Account created successfully ✅");
      setTimeout(() => navigate("/"), 1200);

    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <motion.div
      className="register-container"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Decorative leaves */}
      <span className="register-leaf">🌿</span>
      <span className="register-leaf">🎋</span>
      <span className="register-leaf">🍃</span>

      <div className="register-card">

        {/* Top Bar */}
        <div className="register-card-top">
          <div className="register-logo">🌿</div>
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Sign up for your ECOFY account</p>
        </div>

        {/* Form Body */}
        <div className="register-body">
          {error && <div className="register-error">❌ {error}</div>}
          {message && <div className="register-success">✅ {message}</div>}

          <form onSubmit={handleRegister}>
            <div className="register-field">
              <label className="register-label">Email Address</label>
              <input
                className="register-input"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label className="register-label">Password</label>
              <input
                className="register-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="register-btn-wrap">
              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? "🌿 Creating Account..." : "Register"}
              </button>
            </div>
          </form>

          <div className="register-login">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Register;