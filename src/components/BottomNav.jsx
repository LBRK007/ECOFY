import { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiHome,
  FiUser,
  FiShoppingCart,
  FiMenu,
  FiPackage,
  FiLogOut,
  FiLogIn,
  FiUserPlus,
  FiSettings,
  FiCheckCircle,
} from "react-icons/fi";
import { CartContext } from "../context/CartContext";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./BottomNav.css";

function BottomNav() {
  const { cart } = useContext(CartContext);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  /* ── Auth + role (mirrors your Navbar.jsx exactly) ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) setRole(docSnap.data().role);
        } catch (err) {
          console.error("Role fetch error:", err);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  /* Close More menu on route change */
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    setMoreOpen(false);
    navigate("/");
  };

  const go = (path) => { navigate(path); setMoreOpen(false); };

  /* Which path counts as "active" for each tab */
  const isHome    = location.pathname === "/" || location.pathname === "/products" || location.pathname.startsWith("/products/");
  const isProfile = location.pathname === "/profile";
  const isCart    = location.pathname === "/cart";
  const isAdmin   = location.pathname.startsWith("/admin") || location.pathname === "/completed-orders";

  return (
    <>
      {/* ── More menu backdrop ── */}
      {moreOpen && (
        <div
          className="bn-backdrop"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── More slide-up sheet ── */}
      <div className={`bn-more-sheet ${moreOpen ? "open" : ""}`}>
        <div className="bn-sheet-handle" />

        <p className="bn-sheet-title">More</p>

        {role === "admin" && (
          <>
            <SheetRow
              icon={<FiSettings size={18} />}
              label="Admin Dashboard"
              onClick={() => go("/admin")}
              active={location.pathname === "/admin"}
            />
            <SheetRow
              icon={<FiPackage size={18} />}
              label="Manage Products"
              onClick={() => go("/adminproducts")}
              active={location.pathname === "/adminproducts"}
            />
            <SheetRow
              icon={<FiCheckCircle size={18} />}
              label="Completed Orders"
              onClick={() => go("/completed-orders")}
              active={location.pathname === "/completed-orders"}
            />
            <div className="bn-sheet-divider" />
          </>
        )}

        {user ? (
          <SheetRow
            icon={<FiLogOut size={18} />}
            label="Logout"
            onClick={handleLogout}
            danger
          />
        ) : (
          <>
            <SheetRow
              icon={<FiLogIn size={18} />}
              label="Login"
              onClick={() => go("/login")}
              active={location.pathname === "/login"}
            />
            <SheetRow
              icon={<FiUserPlus size={18} />}
              label="Register"
              onClick={() => go("/register")}
              active={location.pathname === "/register"}
            />
          </>
        )}
      </div>

      {/* ── Bottom nav bar ── */}
      <nav className="bottom-nav">

        {/* Home tab — shows Admin if admin role */}
        <NavTab
          icon={role === "admin" ? <FiSettings size={22} /> : <FiHome size={22} />}
          label={role === "admin" ? "Admin" : "Home"}
          active={role === "admin" ? isAdmin : isHome}
          onClick={() => go(role === "admin" ? "/admin" : "/")}
        />

        {/* Products tab (only for non-admins) */}
        {role !== "admin" && (
          <NavTab
            icon={<FiPackage size={22} />}
            label="Products"
            active={location.pathname === "/products" || location.pathname.startsWith("/products/")}
            onClick={() => go("/products")}
          />
        )}

        {/* Cart tab */}
        <NavTab
          icon={
            <span className="bn-icon-wrap">
              <FiShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="bn-badge">{totalItems > 99 ? "99+" : totalItems}</span>
              )}
            </span>
          }
          label="Cart"
          active={isCart}
          onClick={() => go("/cart")}
        />

        {/* Profile tab */}
        <NavTab
          icon={<FiUser size={22} />}
          label={user ? "Profile" : "Account"}
          active={isProfile}
          onClick={() => go(user ? "/profile" : "/login")}
        />

        {/* More tab */}
        <NavTab
          icon={<FiMenu size={22} />}
          label="More"
          active={moreOpen}
          onClick={() => setMoreOpen((prev) => !prev)}
        />

      </nav>
    </>
  );
}

/* ── Tab button ── */
function NavTab({ icon, label, active, onClick }) {
  return (
    <button
      className={`bn-tab ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="bn-tab-icon">{icon}</span>
      <span className="bn-tab-label">{label}</span>
    </button>
  );
}

/* ── Sheet row ── */
function SheetRow({ icon, label, onClick, active, danger }) {
  return (
    <button
      className={`bn-sheet-row ${active ? "active" : ""} ${danger ? "danger" : ""}`}
      onClick={onClick}
    >
      <span className="bn-sheet-row-icon">{icon}</span>
      <span className="bn-sheet-row-label">{label}</span>
      <span className="bn-sheet-row-arrow">›</span>
    </button>
  );
}

export default BottomNav;