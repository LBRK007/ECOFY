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
  // ✅ Fixed: was `Wishlist` (undefined), now correctly destructures `wishlist`
  const { wishlist, toggleWishlist, user } = useWishlist();
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

  const active = wishlist.includes(productId);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }

    setAnimating(true);
    try {
      await toggleWishlist(productId);
    } catch (err) {
      console.error("Wishlist error:", err);
    }
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        outline: "none",
        lineHeight: 1,
        ...style,
      }}
    >
      <span
        style={{
          color: active ? "#e05252" : "#bbb",
          fontSize: size,
          transition: "color 0.2s, transform 0.2s",
          display: "inline-block",
          transform: animating ? "scale(1.35)" : "scale(1)",
        }}
      >
        {active ? "♥" : "♡"}
      </span>
    </button>
  );
}

export default HeartButton;