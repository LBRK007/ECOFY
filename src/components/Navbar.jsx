import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import logo from "../assets/logo.png";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FaCartArrowDown,    } from "react-icons/fa";
import {  RiAccountCircleLine  } from "react-icons/ri"
import {  CiLogout   } from "react-icons/ci"

function Navbar() {
  const { cart } = useContext(CartContext);
  const [user, setUser]               = useState(null);
  const [role, setRole]               = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const navigate = useNavigate();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  /* ── Scroll-aware glass effect ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Auth + Role ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          if (snap.exists()) setRole(snap.data().role);
        } catch (err) {
          console.error("Role fetch error:", err);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowDropdown(false);
    navigate("/");
  };

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>

      {/* ── LEFT ── */}
      <div className="nav-left">
        {role === "admin" ? (
          <Link to="/admin" className="nav-btn">Admin</Link>
        ) : (
          <Link to="/" className="nav-btn">Home</Link>
        )}
        <Link to="/products" className="nav-btn">Products</Link>
      </div>

      {/* ── CENTER LOGO ── */}
      <div className="nav-center">
        <div className="logo-click-area">
          <Link to="/">
            <img src={logo} alt="ECOFY" className="nav-logo" />
          </Link>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="nav-right">

        {/* Account dropdown */}
        <div
          className="account-container"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <button className="nav-btn">
            <RiAccountCircleLine    className="account-icon" />
            {user ? ` Account` : `Login`}
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              {user ? (
                <>
          <div
            className="dropdown-item"
            onClick={() => { navigate("/profile"); setShowDropdown(false); }}
          >
            <RiAccountCircleLine className="icon" /> My Profile
          </div>
        <div className="dropdown-item logout" onClick={handleLogout}>
          <CiLogout className="icon" /> Logout
        </div>
                </>
              ) : (
                <>
                  <div className="dropdown-item" onClick={() => { navigate("/login"); setShowDropdown(false); }}>
                    Login
                  </div>
                  <div className="dropdown-item" onClick={() => { navigate("/register"); setShowDropdown(false); }}>
                    Register
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Cart — logged-in non-admin only */}
        {user && role !== "admin" && (
          <Link to="/cart" className="nav-btn cart-btn">
            <FaCartArrowDown className="cart-icon" />
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </Link>
        )}
      </div>

    </nav>
  );
}

export default Navbar;