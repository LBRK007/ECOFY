const STATUS_COLORS = {
  Pending: "#ff9800",
  Shipped: "#2196F3",
  Delivered: "#4CAF50",
  Cancelled: "#f44336",
};

function StatusBadge({ status }) {
  return (
    <span
      style={{
        background: STATUS_COLORS[status] || "#999",
        color: "white",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: "500",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export default StatusBadge;