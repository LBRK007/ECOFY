import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import logo from "../assets/ecofy-logo.png";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function Navbar() {
  const { cart } = useContext(CartContext);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  /* ===============================
     🔐 Auth Listener
  =============================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  /* ===============================
     🚪 Logout
  =============================== */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar">

      {/* ===== Left Side ===== */}
      <div className="nav-left">
        <Link to="/" className="nav-btn">Home</Link>
        <Link to="/products" className="nav-btn">Products</Link>
      </div>

      {/* ===== Center Logo ===== */}
      <div className="nav-center">
        <img src={logo} alt="ECOFY Logo" className="nav-logo" />
      </div>

      {/* ===== Right Side ===== */}
      <div className="nav-right">

        {/* 🔥 Account Dropdown */}
        <div
          className="account-container"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <button className="nav-btn">
            {user ? "Account" : "Login"}
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              {user ? (
                <>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/login")}
                  >
                    login
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/profile")}
                  >
                    My Profile
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={handleLogout}
                  >
                    Logout
                  </div>
                </>
              ) : (
                <div
                  className="dropdown-item"
                  onClick={() => navigate("/login")}
                >
                  Login
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart */}
        <Link to="/cart" className="nav-btn">
          Cart ({totalItems})
        </Link>

      </div>
    </nav>
  );
}

export default Navbar;