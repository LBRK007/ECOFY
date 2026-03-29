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
  const { isWishlisted, toggleWishlist, user } = useWishlist();
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

  const active = isWishlisted(productId);

  const handleClick = async (e) => {
    e.stopPropagation(); // prevent card navigation

    if (!user) {
      navigate("/login");
      return;
    }

    setAnimating(true);
    await toggleWishlist(productId);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      title={active ? "Remove from wishlist" : "Save to wishlist"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transform: animating ? "scale(1.4)" : "scale(1)",
        transition: "transform 0.2s ease",
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "#e53935" : "none"}
        stroke={active ? "#e53935" : "#aaa"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.2s, stroke 0.2s" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

export default HeartButton;