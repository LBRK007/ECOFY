import { Link } from "react-router-dom";
import "./Navbar.css";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import logo from "../assets/ecofy-logo.png";

function Navbar() {

  const { cart } = useContext(CartContext);

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <nav className="navbar">

      {/* Left Side */}
      <div className="nav-left">
        <Link to="/" className="nav-btn">Home</Link>
        <Link to="/products" className="nav-btn">Products</Link>
      </div>

      {/* Center Logo */}
      <div className="nav-center">
        <img src={logo} alt="ECOFY Logo" className="nav-logo" />
      </div>

      {/* Right Side */}
      <div className="nav-right">
        <Link to="/login" className="nav-btn">Login</Link>
        <Link to="/cart" className="nav-btn">
          Cart ({totalItems})
        </Link>
      </div>

    </nav>
  );
}

export default Navbar;