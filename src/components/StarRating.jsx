  /**
 * StarRating — reusable component for both display and interactive input.
 *
 * Props:
 *   rating      {number}   — current value (0–5)
 *   onChange    {function} — if provided, renders clickable stars (input mode)
 *   size        {number}   — font size in px (default 20)
 *   showEmpty   {boolean}  — show grey empty stars (default true)
 */
function StarRating({ rating = 0, onChange, size = 20, showEmpty = true }) {
  const isInteractive = typeof onChange === "function";

  return (
    <span style={{ display: "inline-flex", gap: "2px", lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return (
          <span
            key={star}
            onClick={() => isInteractive && onChange(star)}
            style={{
              fontSize: `${size}px`,
              color: filled ? "#F9A825" : "#ddd",
              cursor: isInteractive ? "pointer" : "default",
              transition: "color 0.15s, transform 0.1s",
              display: "inline-block",
              userSelect: "none",
              // hide empty stars if showEmpty is false (used on product cards)
              opacity: !filled && !showEmpty ? 0 : 1,
            }}
            onMouseEnter={(e) => {
              if (isInteractive) e.currentTarget.style.transform = "scale(1.25)";
            }}
            onMouseLeave={(e) => {
              if (isInteractive) e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

export default StarRating;