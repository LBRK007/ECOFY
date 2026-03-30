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
  FiX,
} from "react-icons/fi";
import { CartContext } from "../context/CartContext";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./BottomNav.css";

export default function BottomNav() {
  const { cart } = useContext(CartContext);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ── Auth & Role ──
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
      } else setRole(null);
    });
    return () => unsubscribe();
  }, []);

  // Close More sheet on route change
  useEffect(() => setMoreOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    setMoreOpen(false);
    navigate("/");
  };

  const go = (path) => { navigate(path); setMoreOpen(false); };

  // ── Active states ──
  const isHome = location.pathname === "/" || location.pathname === "/products" || location.pathname.startsWith("/products/");
  const isCart = location.pathname === "/cart";
  const isProfile = location.pathname === "/profile";
  const isAdmin = location.pathname.startsWith("/admin") || location.pathname === "/completed-orders";

  return (
    <>
      {/* Backdrop */}
      {moreOpen && <div className="bn-backdrop" onClick={() => setMoreOpen(false)} />}

      {/* Slide-up More sheet */}
      <div className={`bn-more-sheet ${moreOpen ? "open" : ""}`}>
        <div className="bn-sheet-handle" />
        <p className="bn-sheet-title">More Options</p>

        {role === "admin" && (
          <>
            <SheetRow icon={<FiSettings />} label="Admin Dashboard" onClick={() => go("/admin")} active={location.pathname === "/admin"} />
            <SheetRow icon={<FiPackage />} label="Manage Products" onClick={() => go("/adminproducts")} active={location.pathname === "/adminproducts"} />
            <SheetRow icon={<FiCheckCircle />} label="Completed Orders" onClick={() => go("/completed-orders")} active={location.pathname === "/completed-orders"} />
            <div className="bn-sheet-divider" />
          </>
        )}

        {user ? (
          <SheetRow icon={<FiLogOut />} label="Logout" onClick={handleLogout} danger />
        ) : (
          <>
            <SheetRow icon={<FiLogIn />} label="Login" onClick={() => go("/login")} active={location.pathname === "/login"} />
            <SheetRow icon={<FiUserPlus />} label="Create Account" onClick={() => go("/register")} active={location.pathname === "/register"} />
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <NavTab icon={role === "admin" ? <FiSettings /> : <FiHome />} label={role === "admin" ? "Admin" : "Home"} active={role === "admin" ? isAdmin : isHome} onClick={() => go(role === "admin" ? "/admin" : "/")} />

        {role !== "admin" && <NavTab icon={<FiPackage />} label="Products" active={location.pathname.startsWith("/products")} onClick={() => go("/products")} />}

        <NavTab icon={<FiUser />} label={user ? "Profile" : "Account"} active={isProfile} onClick={() => go(user ? "/profile" : "/login")} />

        {user && role !== "admin" && (
          <NavTab
            icon={
              <span className="bn-icon-wrap">
                <FiShoppingCart />
                {totalItems > 0 && <span className="bn-badge">{totalItems > 99 ? "99+" : totalItems}</span>}
              </span>
            }
            label="Cart"
            active={isCart}
            onClick={() => go("/cart")}
          />
        )}

        <NavTab icon={moreOpen ? <FiX /> : <FiMenu />} label="More" active={moreOpen} onClick={() => setMoreOpen(prev => !prev)} />
      </nav>
    </>
  );
}

/* ── Nav Tab ── */
function NavTab({ icon, label, active, onClick }) {
  return (
    <button className={`bn-tab ${active ? "active" : ""}`} onClick={onClick}>
      <span className="bn-tab-icon">{icon}</span>
      <span className="bn-tab-label">{label}</span>
    </button>
  );
}

/* ── Sheet Row ── */
function SheetRow({ icon, label, onClick, active, danger }) {
  return (
    <button className={`bn-sheet-row ${active ? "active" : ""} ${danger ? "danger" : ""}`} onClick={onClick}>
      <span className="bn-sheet-row-icon">{icon}</span>
      <span className="bn-sheet-row-label">{label}</span>
      <span className="bn-sheet-row-arrow">›</span>
    </button>
  );
}