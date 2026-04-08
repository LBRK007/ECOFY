import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ADMIN_EMAIL } from "../constants";
import { useToast } from "../hooks/useToast";

/* ── design tokens ── */
const T = {
  gd:    "#1a3a2a",
  gm:    "#2d5a3d",
  gf:    "#4a8c5c",
  gl:    "#a8d5b5",
  gp:    "#e8f5ec",
  cr:    "#faf6f0",
  cd:    "#f0e9de",
  td:    "#1c2b1e",
  tm:    "#4a5e4e",
  tl:    "#7a9480",
  wh:    "#ffffff",
  err:   "#c0392b",
  errBg: "#fff5f5",
  inf:   "#1565c0",
  infBg: "#e3f2fd",
  amb:   "#b45309",
  ambBg: "#fffbeb",
  ambBd: "#fde68a",
};

const S = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(160deg, ${T.cr} 0%, ${T.cd} 100%)`,
    fontFamily: "'Jost', sans-serif",
    paddingBottom: "60px",
  },
  header: {
    background: T.gd,
    padding: "32px 48px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(168,213,181,0.15)",
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.7rem",
    fontWeight: 700,
    color: T.wh,
    margin: 0,
    letterSpacing: "0.01em",
  },
  headerSub: {
    fontSize: "0.82rem",
    color: "rgba(255,255,255,0.5)",
    marginTop: "4px",
    letterSpacing: "0.04em",
  },
  headerBadge: {
    background: "rgba(168,213,181,0.15)",
    border: "1px solid rgba(168,213,181,0.3)",
    color: T.gl,
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "6px 16px",
    borderRadius: "100px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "32px",
    padding: "36px 48px",
    maxWidth: "1400px",
    margin: "0 auto",
    alignItems: "start",
  },
  formPanel: {
    background: T.wh,
    borderRadius: "20px",
    boxShadow: "0 4px 32px rgba(26,58,42,0.08)",
    overflow: "hidden",
    position: "sticky",
    top: "88px",
  },
  formHeader: {
    background: `linear-gradient(135deg, ${T.gd}, ${T.gm})`,
    padding: "24px 28px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  formHeaderIcon: { fontSize: "1.4rem" },
  formHeaderTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: T.wh,
    margin: 0,
  },
  formBody: { padding: "28px" },
  label: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: T.gd,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: "7px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid rgba(26,58,42,0.15)",
    borderRadius: "12px",
    fontFamily: "'Jost', sans-serif",
    fontSize: "0.92rem",
    color: T.td,
    background: T.cr,
    outline: "none",
    transition: "border-color 0.25s ease",
    boxSizing: "border-box",
  },
  inputFocus: { borderColor: T.gf },
  fileZone: {
    width: "100%",
    padding: "20px",
    border: "2px dashed rgba(74,140,92,0.35)",
    borderRadius: "12px",
    background: T.gp,
    textAlign: "center",
    cursor: "pointer",
    fontSize: "0.85rem",
    color: T.tm,
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    background: T.gd,
    color: T.wh,
    border: "none",
    borderRadius: "100px",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "background 0.25s ease, transform 0.2s ease",
    letterSpacing: "0.02em",
  },
  btnEdit: {
    width: "100%",
    padding: "14px",
    background: "#1565c0",
    color: T.wh,
    border: "none",
    borderRadius: "100px",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "background 0.25s ease",
  },
  btnCancel: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: T.tm,
    border: "1.5px solid rgba(26,58,42,0.15)",
    borderRadius: "100px",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 500,
    fontSize: "0.88rem",
    cursor: "pointer",
  },
  fieldGroup: { marginBottom: "18px" },
  gridPanel: {},
  gridHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  gridTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    fontWeight: 700,
    color: T.gd,
    margin: 0,
  },
  countBadge: {
    background: T.gp,
    color: T.gf,
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: "100px",
    letterSpacing: "0.08em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    background: T.wh,
    borderRadius: "18px",
    boxShadow: "0 4px 20px rgba(26,58,42,0.07)",
    overflow: "hidden",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
    cursor: "default",
  },
  cardImg: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover",
    display: "block",
    background: T.gp,
  },
  cardBody: { padding: "16px" },
  cardName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem",
    fontWeight: 600,
    color: T.gd,
    marginBottom: "6px",
  },
  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  cardPrice: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: T.gf,
    fontFamily: "'Playfair Display', serif",
  },
  cardStock: {
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "100px",
  },
  cardActions: { display: "flex", gap: "8px" },
  btnCardEdit: {
    flex: 1,
    padding: "8px",
    background: T.infBg,
    color: T.inf,
    border: "none",
    borderRadius: "8px",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  btnCardDel: {
    flex: 1,
    padding: "8px",
    background: T.errBg,
    color: T.err,
    border: "none",
    borderRadius: "8px",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  empty: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "64px 24px",
    color: T.tl,
    fontSize: "0.95rem",
  },
  loading: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Jost', sans-serif",
    color: T.tm,
    fontSize: "1rem",
    background: T.cr,
  },
};

/* ── quick-preset options ── */
const TIME_PRESETS = [
  { label: "1h",  ms: 1  * 60 * 60 * 1000 },
  { label: "6h",  ms: 6  * 60 * 60 * 1000 },
  { label: "12h", ms: 12 * 60 * 60 * 1000 },
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "48h", ms: 48 * 60 * 60 * 1000 },
  { label: "7d",  ms: 7  * 24 * 60 * 60 * 1000 },
];

/* ── helper: ms → readable countdown string ── */
function formatCountdown(diff) {
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
function AdminProducts() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [name,         setName]         = useState("");
  const [price,        setPrice]        = useState("");
  const [stock,        setStock]        = useState("");
  const [imageFile,    setImageFile]    = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  /* ── time-limit state ── */
  const [timeLimitOn,    setTimeLimitOn]    = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);   // e.g. "6h"
  const [customDateTime, setCustomDateTime] = useState("");     // datetime-local string

  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  /* ── auth guard ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        toast("Access Denied", "error");
        navigate("/");
        return;
      }
      fetchProducts();
    });
    return () => unsub();
  }, [navigate, toast]);

  /* ── fetch products ── */
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Cloudinary upload ── */
  const uploadImage = async () => {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("file", imageFile);
    fd.append("upload_preset", "ecofy_upload");
    const res  = await fetch("https://api.cloudinary.com/v1_1/ddhewvyxh/image/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.secure_url) throw new Error("Image upload failed");
    return data.secure_url;
  };

  /* ── compute expiry ISO from current selections ── */
  const computeExpiryISO = () => {
    if (!timeLimitOn) return null;
    if (selectedPreset) {
      const preset = TIME_PRESETS.find(p => p.label === selectedPreset);
      if (preset) return new Date(Date.now() + preset.ms).toISOString();
    }
    if (customDateTime) return new Date(customDateTime).toISOString();
    return null;
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !stock) {
      toast("Please fill all required fields", "warning");
      return;
    }
    if (timeLimitOn && !selectedPreset && !customDateTime) {
      toast("⏳ Choose a preset or pick a custom date & time for the time limit", "warning");
      return;
    }

    setSubmitting(true);
    try {
      let imageURL = null;
      if (imageFile) imageURL = await uploadImage();

      const expiresAt = computeExpiryISO();

      if (editingId) {
        const upd = { name, price: Number(price), stock: Number(stock) };
        if (imageURL)  upd.image     = imageURL;
        upd.expiresAt = expiresAt ?? null;   // null clears existing timer
        await updateDoc(doc(db, "products", editingId), upd);
        toast("Product updated ✅", "success");
      } else {
        if (!imageURL) { toast("Please upload an image", "warning"); setSubmitting(false); return; }
        await addDoc(collection(db, "products"), {
          name,
          price:     Number(price),
          stock:     Number(stock),
          image:     imageURL,
          expiresAt: expiresAt ?? null,
        });
        toast(
          expiresAt
            ? `🌿 Added! Auto-deletes in ${selectedPreset || "custom time"} ⏳`
            : "Product added 🌿",
          "success"
        );
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── reset form ── */
  const resetForm = () => {
    setName(""); setPrice(""); setStock(""); setImageFile(null); setEditingId(null);
    setTimeLimitOn(false); setSelectedPreset(null); setCustomDateTime("");
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast("Product deleted", "info");
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast("Failed to delete product", "error");
    }
  };

  /* ── start edit ── */
  const startEdit = (p) => {
    setName(p.name); setPrice(p.price); setStock(p.stock); setEditingId(p.id);
    if (p.expiresAt) {
      setTimeLimitOn(true);
      const d     = new Date(p.expiresAt);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);
      setCustomDateTime(local);
      setSelectedPreset(null);
    } else {
      setTimeLimitOn(false); setSelectedPreset(null); setCustomDateTime("");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputStyle = (field) => ({
    ...S.input,
    ...(focusedField === field ? S.inputFocus : {}),
  });

  /* min value for the datetime-local input = now */
  const minDatetime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  if (loading) return (
    <div style={S.loading}><span>🌿 Loading products...</span></div>
  );

  return (
    <div style={S.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <ToastContainer />

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.headerTitle}>🌿 Product Management</h1>
          <p style={S.headerSub}>ECOFY Admin Dashboard</p>
        </div>
        <span style={S.headerBadge}>{products.length} Products</span>
      </div>

      <div style={S.layout}>

        {/* ══ Form Panel ══ */}
        <div style={S.formPanel}>
          <div style={S.formHeader}>
            <span style={S.formHeaderIcon}>{editingId ? "✏️" : "🪴"}</span>
            <h2 style={S.formHeaderTitle}>
              {editingId ? "Edit Product" : "Add New Product"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={S.formBody}>

            {/* Product Name */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Name</label>
              <input
                style={inputStyle("name")}
                type="text"
                placeholder="Product Name"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            {/* Price & Stock */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Price (₹)</label>
                <input
                  style={inputStyle("price")}
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  onFocus={() => setFocusedField("price")}
                  onBlur={() => setFocusedField(null)}
                  min="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Stock</label>
                <input
                  style={inputStyle("stock")}
                  type="number"
                  placeholder="Qty"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  onFocus={() => setFocusedField("stock")}
                  onBlur={() => setFocusedField(null)}
                  min="0"
                />
              </div>
            </div>

            {/* Image upload */}
            <label style={S.label}>Product Image {editingId && "(optional)"}</label>
            <div style={{...S.fieldGroup, marginLeft: "200px" }}>
              <label style={S.fileZone}>
                {imageFile ? `📎 ${imageFile.name}` : "upload image"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => setImageFile(e.target.files[0])}
                />
              </label>
            </div>

            {/* ════════ TIME LIMIT SECTION ════════ */}
            <div style={{
              borderRadius: "14px",
              border: timeLimitOn
                ? `1.5px solid ${T.ambBd}`
                : "1.5px solid rgba(26,58,42,0.1)",
              background: timeLimitOn ? T.ambBg : "rgba(26,58,42,0.02)",
              overflow: "hidden",
              marginBottom: "20px",
              transition: "border-color 0.3s, background 0.3s",
            }}>

              {/* Toggle row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  setTimeLimitOn(v => !v);
                  setSelectedPreset(null);
                  setCustomDateTime("");
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.25rem" }}>⏳</span>
                  <div>
                    <div style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: timeLimitOn ? T.amb : T.gd,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      Set Time Limit
                    </div>
                    <div style={{ fontSize: "0.72rem", color: T.tl, marginTop: "2px" }}>
                      Product auto-deletes when timer hits zero
                    </div>
                  </div>
                </div>

                {/* Toggle pill */}
                <div style={{
                  width: "44px", height: "24px",
                  borderRadius: "100px",
                  background: timeLimitOn ? "#f59e0b" : "rgba(26,58,42,0.15)",
                  position: "relative",
                  transition: "background 0.25s",
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: "18px", height: "18px",
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: "3px",
                    left: timeLimitOn ? "23px" : "3px",
                    transition: "left 0.25s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }} />
                </div>
              </div>

              {/* ── Expanded picker ── */}
              {timeLimitOn && (
                <div style={{ padding: "0 16px 18px" }}>

                  {/* Warning banner */}
                  <div style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "0.77rem",
                    color: T.amb,
                    fontWeight: 500,
                    lineHeight: 1.55,
                    marginBottom: "16px",
                  }}>
                    ⚠️ Once the timer expires, this product will be{" "}
                    <strong>permanently removed</strong> from your store automatically —
                    no manual action needed. Perfect for flash sales & limited drops.
                  </div>

                  {/* Quick presets */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ ...S.label, marginBottom: "8px" }}>Quick Presets</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                      {TIME_PRESETS.map(p => {
                        const active = selectedPreset === p.label;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => { setSelectedPreset(p.label); setCustomDateTime(""); }}
                            style={{
                              padding: "6px 15px",
                              borderRadius: "100px",
                              border: active ? "2px solid #f59e0b" : "1.5px solid rgba(180,83,9,0.25)",
                              background: active ? "#f59e0b" : "rgba(245,158,11,0.07)",
                              color: active ? "#fff" : T.amb,
                              fontFamily: "'Jost', sans-serif",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              transition: "all 0.18s",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* OR divider */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
                  }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(180,83,9,0.15)" }} />
                    <span style={{
                      fontSize: "0.7rem", color: T.tl, fontWeight: 700,
                      letterSpacing: "0.07em", textTransform: "uppercase",
                    }}>
                      or pick exact date &amp; time
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(180,83,9,0.15)" }} />
                  </div>

                  {/* Custom datetime picker */}
                  <input
                    type="datetime-local"
                    min={minDatetime}
                    value={customDateTime}
                    onChange={e => { setCustomDateTime(e.target.value); setSelectedPreset(null); }}
                    style={{
                      ...S.input,
                      background: customDateTime ? "#fffbeb" : T.cr,
                      borderColor: customDateTime ? "#f59e0b" : "rgba(26,58,42,0.15)",
                      color: customDateTime ? T.amb : T.tl,
                      fontSize: "0.88rem",
                    }}
                  />

                  {/* Human-readable expiry preview */}
                  {customDateTime && (
                    <div style={{
                      marginTop: "7px", fontSize: "0.75rem",
                      color: T.amb, fontWeight: 500,
                    }}>
                      🗓&nbsp;Expires:{" "}
                      {new Date(customDateTime).toLocaleString("en-IN", {
                        dateStyle: "medium", timeStyle: "short",
                      })}
                    </div>
                  )}

                  {/* Clear */}
                  {(selectedPreset || customDateTime) && (
                    <button
                      type="button"
                      onClick={() => { setSelectedPreset(null); setCustomDateTime(""); }}
                      style={{
                        marginTop: "10px",
                        background: "none", border: "none",
                        color: T.tl, fontSize: "0.74rem",
                        cursor: "pointer", textDecoration: "underline",
                        padding: 0, fontFamily: "'Jost', sans-serif",
                      }}
                    >
                      ✕ Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* ════════ END TIME LIMIT ════════ */}

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(26,58,42,0.08)", margin: "4px 0 20px" }} />

            {/* Submit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ ...(editingId ? S.btnEdit : S.btnPrimary), opacity: submitting ? 0.7 : 1 }}
              >
                {submitting
                  ? "Saving..."
                  : editingId
                    ? "Update Product"
                    : timeLimitOn
                      ? "Add Limited-Time Product"
                      : "Add Product"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} style={S.btnCancel}>
                  Cancel Edit
                </button>
              )}
            </div>

          </form>
        </div>

        {/* ══ Products Grid ══ */}
        <div style={S.gridPanel}>
          <div style={S.gridHeader}>
            <h2 style={S.gridTitle}>All Products</h2>
            <span style={S.countBadge}>{products.length} total</span>
          </div>

          <div style={S.grid}>
            {products.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🌱</div>
                <p>No products yet. Add your first one!</p>
              </div>
            ) : (
              products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onEdit={() => startEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                  onExpired={() => setProducts(prev => prev.filter(x => x.id !== p.id))}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PRODUCT CARD — with auto-delete on expiry
══════════════════════════════════════════ */
function ProductCard({ product, onEdit, onDelete, onExpired }) {
  const [hovered,  setHovered]  = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired,  setExpired]  = useState(false);

  const stockColor = product.stock > 10
    ? { background: "#e8f5ec", color: "#2d5a3d" }
    : product.stock > 0
    ? { background: "#fff8e1", color: "#8d6e00" }
    : { background: "#fff5f5", color: "#c0392b" };

  /* ── live countdown + auto-delete when it hits 0 ── */
  useEffect(() => {
    if (!product.expiresAt) return;

    const tick = async () => {
      const diff = new Date(product.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        setExpired(true);
        clearInterval(interval);
        try {
          await deleteDoc(doc(db, "products", product.id));
          onExpired?.();
        } catch (err) {
          console.error("Auto-delete failed:", err);
        }
      } else {
        setTimeLeft(formatCountdown(diff));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [product.expiresAt, product.id, onExpired]);

  /* hide card once expired & deleted */
  if (expired) return null;

  /* urgency colours based on remaining time */
  const urgency = (() => {
    if (!product.expiresAt) return null;
    const diff = new Date(product.expiresAt).getTime() - Date.now();
    if (diff < 60 * 60 * 1000)      return { bg: "#fee2e2", text: "#c0392b", dot: "#ef4444" }; // <1h  red
    if (diff < 6  * 60 * 60 * 1000) return { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" }; // <6h  orange
    return                                  { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" }; // else amber
  })();

  return (
    <div
      style={{
        ...S.card,
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 36px rgba(26,58,42,0.13)"
          : "0 4px 20px rgba(26,58,42,0.07)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img src={product.image} alt={product.name} style={S.cardImg} />

      <div style={S.cardBody}>
        <div style={S.cardName}>{product.name}</div>

        <div style={S.cardMeta}>
          <span style={S.cardPrice}>₹{product.price}</span>
          <span style={{ ...S.cardStock, ...stockColor }}>
            {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
          </span>
        </div>

        {/* Live countdown badge */}
        {timeLeft && urgency && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: urgency.bg,
            color: urgency.text,
            borderRadius: "10px",
            padding: "7px 12px",
            marginBottom: "10px",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}>
            {/* pulsing dot */}
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: urgency.dot, display: "inline-block",
              animation: "ecofyPulse 1.2s infinite",
              flexShrink: 0,
            }} />
            <style>{`@keyframes ecofyPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
            ⏳ {timeLeft} left — auto-deletes
          </div>
        )}

        <div style={S.cardActions}>
          <button style={S.btnCardEdit} onClick={onEdit}>Edit</button>
          <button style={S.btnCardDel}  onClick={onDelete}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}

export default AdminProducts;