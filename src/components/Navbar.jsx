import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import logo from "../assets/logo.png";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Navbar() {
  const { cart } = useContext(CartContext);

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const navigate = useNavigate();

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // 🔐 Auth + Role Fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          }
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔓 Logout
  const handleLogout = async () => {
    await signOut(auth);
    setShowDropdown(false);
    navigate("/");
  };

  return (
    <nav className="navbar">

      {/* LEFT */}
      <div className="nav-left">

        {/* 🔥 Admin or Home */}
        {role === "admin" ? (
          <Link to="/admin" className="nav-btn">Admin</Link>
        ) : (
          <Link to="/" className="nav-btn">Home</Link>
        )}

        <Link to="/products" className="nav-btn">Products</Link>
      </div>

      {/* CENTER LOGO */}
      <div className="nav-center">
        <img src={logo} alt="ECOFY Logo" className="nav-logo" />
      </div>

      {/* RIGHT */}
      <div className="nav-right">

        {/* ACCOUNT DROPDOWN */}
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
                    onClick={() => {
                      navigate("/profile");
                      setShowDropdown(false);
                    }}
                  >
                    My Profile
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={handleLogout}
                    style={{ color: "#f44336" }}
                  >
                    Logout
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/login");
                      setShowDropdown(false);
                    }}
                  >
                    Login
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/register");
                      setShowDropdown(false);
                    }}
                  >
                    Register
                  </div>
                </>
              )}

            </div>
          )}
        </div>

        {/* CART */}
        <Link to="/cart" className="nav-btn cart-btn">
          Cart {totalItems > 0 && `(${totalItems})`}
        </Link>

      </div>
    </nav>
    
  );
}

export default Navbar;