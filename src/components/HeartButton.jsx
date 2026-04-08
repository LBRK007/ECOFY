import { useState } from "react";
import { useWishlist } from "../context/WishlistContext";
import { useNavigate } from "react-router-dom";
/**
 * HeartButton — drops into any product UI.
 * Props:
 *   productId  {string}
 *   size       {number}  px, default 22
 *   style      {object}  extra wrapper styles
 */


function HeartButton({ productId, size = 22, style = {} }) {
  const { Wishlist, toggleWishlist, user } = useWishlist();
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

  const active = Wishlist.includes(productId);

  const handleClick = async (e) => {
    e.stopPropagation(); // prevent card navigation

    if (!user) {
      navigate("/login"); // redirect if not logged in
      return;
    }

    setAnimating(true);
    try {
      await toggleWishlist(productId); // add/remove from wishlist
    } catch (err) {
      console.error("Wishlist error:", err);
    }
    setTimeout(() => setAnimating(false), 300); // reset animation
  };

  return (
    <button
      onClick={handleClick}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      <span
        className={`heart-icon ${animating ? "heart-bounce" : ""}`}
        style={{
          color: active ? "red" : "#aaa",
          fontSize: size,
          transition: "0.2s",
          display: "inline-block",
        }}
      >
        ♥
      </span>
    </button>
  );
}

export default HeartButton;