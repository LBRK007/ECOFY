import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_EMAIL } from "../constants";
import "./Login.css";

function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const navigate = useNavigate();

  /* ── Login ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(email === ADMIN_EMAIL ? "/admin" : "/");
    } catch {
      setError("Invalid email or password ❌");
    }

    setLoading(false);
  };

  /* ── Forgot password ── */
  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Enter your email first 📧");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent ✅");
    } catch {
      setError("Failed to send reset email ❌");
    }
  };

  return (
    <motion.div
      className="login-container"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* decorative leaves */}
      <span className="login-leaf">🌿</span>
      <span className="login-leaf">🎋</span>
      <span className="login-leaf">🍃</span>

      <div className="login-card">

        {/* ── Top bar ── */}
        <div className="login-card-top">
          <div className="login-logo">🌿</div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your ECOFY account</p>
        </div>

        {/* ── Form ── */}
        <div className="login-body">
          {error   && <div className="login-error">   ❌ {error}   </div>}
          {message && <div className="login-success"> ✅ {message} </div>}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label">Email Address</label>
              <input
                className="login-input"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {/* ── Button ── */}
            <div className="login-btn-wrap">
              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                {loading ? "🌿 Logging in..." : "Login"}
              </button>
            </div>
          </form>

          <span className="login-forgot" onClick={handleForgotPassword}>
            Forgot Password?
          </span>

          <div className="login-register">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default Login;