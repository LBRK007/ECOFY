import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * OrdersChart
 * Props:
 *   orders  {Array}  — the live orders array from Admin (already filtered to active)
 *   allOrders {Array} — unfiltered orders including Delivered (passed separately for full revenue picture)
 */
function OrdersChart({ orders = [], allOrders = [] }) {
  const [range, setRange] = useState(7);       // 7 or 30 days
  const [metric, setMetric] = useState("both"); // "orders" | "revenue" | "both"
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    buildChartData(allOrders.length > 0 ? allOrders : orders, range);
  }, [orders, allOrders, range]);

  const buildChartData = (data, days) => {
    // Build an array of the last N days: [{ date, label, orders, revenue }]
    const today = new Date();
    const buckets = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      buckets[key] = {
        date: key,
        label: d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        orders: 0,
        revenue: 0,
      };
    }

    // Slot each order into its bucket
    data.forEach((order) => {
      if (!order.createdAt) return;
      const orderDate = order.createdAt.toDate().toISOString().slice(0, 10);
      if (buckets[orderDate] && order.status !== "Cancelled") {
        buckets[orderDate].orders += 1;
        buckets[orderDate].revenue += order.total || 0;
      }
    });

    setChartData(Object.values(buckets));
  };

  /* ── Summary stats for the selected range ── */
  const totalOrders  = chartData.reduce((s, d) => s + d.orders, 0);
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const peakDay      = chartData.reduce((best, d) => (d.orders > best.orders ? d : best), { orders: 0, label: "—" });

  /* ── Custom tooltip ── */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
        fontSize: "13px",
      }}>
        <p style={{ margin: "0 0 8px", fontWeight: "600", color: "#333" }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ margin: "3px 0", color: p.color }}>
            {p.name}: {p.dataKey === "revenue" ? `₹ ${p.value}` : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.wrapper}>
      {/* ── Header row ── */}
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0, fontSize: "17px" }}>Orders Analytics</h2>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* Range toggle */}
          <div style={styles.toggleGroup}>
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                style={range === d ? styles.toggleActive : styles.toggle}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Metric toggle */}
          <div style={styles.toggleGroup}>
            {[
              { key: "both",    label: "All"     },
              { key: "orders",  label: "Orders"  },
              { key: "revenue", label: "Revenue" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                style={metric === key ? styles.toggleActive : styles.toggle}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div style={styles.statRow}>
        <StatPill label={`Orders (${range}d)`} value={totalOrders} color="#4CAF50" />
        <StatPill label={`Revenue (${range}d)`} value={`₹ ${totalRevenue.toLocaleString("en-IN")}`} color="#2196F3" />
        <StatPill label="Busiest day" value={peakDay.label} color="#ff9800" />
      </div>

      {/* ── Chart ── */}
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            interval={range === 30 ? 4 : 0}
          />

          {/* Left Y — order count */}
          <YAxis
            yAxisId="orders"
            orientation="left"
            tick={{ fontSize: 11, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />

          {/* Right Y — revenue */}
          <YAxis
            yAxisId="revenue"
            orientation="right"
            tick={{ fontSize: 11, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
            iconType="circle"
            iconSize={8}
          />

          {/* Bars — orders */}
          {(metric === "both" || metric === "orders") && (
            <Bar
              yAxisId="orders"
              dataKey="orders"
              name="Orders"
              fill="#4CAF50"
              radius={[5, 5, 0, 0]}
              maxBarSize={36}
              opacity={0.85}
            />
          )}

          {/* Line — revenue */}
          {(metric === "both" || metric === "revenue") && (
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="Revenue (₹)"
              stroke="#2196F3"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2196F3", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Stat pill ── */
const StatPill = ({ label, value, color }) => (
  <div style={{ ...styles.statPill, borderLeft: `3px solid ${color}` }}>
    <p style={{ margin: 0, fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: ".04em" }}>
      {label}
    </p>
    <p style={{ margin: "3px 0 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
      {value}
    </p>
  </div>
);

/* ── Styles ── */
const styles = {
  wrapper: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    marginBottom: "36px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  statRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  statPill: {
    background: "#fafafa",
    border: "0.5px solid #eee",
    borderRadius: "10px",
    padding: "12px 18px",
    flex: "1 1 140px",
  },
  toggleGroup: {
    display: "flex",
    background: "#f5f5f5",
    borderRadius: "8px",
    padding: "3px",
    gap: "2px",
  },
  toggle: {
    padding: "5px 12px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#666",
    fontWeight: "500",
  },
  toggleActive: {
    padding: "5px 12px",
    background: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#2E7D32",
    fontWeight: "600",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
};

export default OrdersChart;