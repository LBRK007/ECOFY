import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();
  const ADMIN_EMAIL = "irfanmk@gmail.com";

  /* ===============================
     🔐 Admin Authentication
  =============================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied ❌");
        navigate("/");
        return;
      }
      fetchProducts();
    });

    return () => unsubscribe();
  }, [navigate]);

  /* ===============================
     📦 Fetch Products
  =============================== */
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "products"));

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(list);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     ☁️ Upload Image to Cloudinary
  =============================== */
  const uploadImage = async () => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", "ecofy_upload");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/ddhewvyxh/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error("Image upload failed");
    }

    return data.secure_url;
  };

  /* ===============================
     ➕ Add / ✏️ Update Product
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !price || !stock) {
      alert("Please fill all required fields");
      return;
    }

    try {
      let imageURL = null;

      if (imageFile) {
        imageURL = await uploadImage();
      }

      // ✏️ UPDATE MODE
      if (editingId) {
        const productRef = doc(db, "products", editingId);

        const updatedData = {
          name,
          price: Number(price),
          stock: Number(stock),
        };

        if (imageURL) {
          updatedData.image = imageURL;
        }

        await updateDoc(productRef, updatedData);

        alert("Product updated ✅");
      }

      // ➕ ADD MODE
      else {
        if (!imageURL) {
          alert("Please upload an image");
          return;
        }

        await addDoc(collection(db, "products"), {
          name,
          price: Number(price),
          stock: Number(stock),
          image: imageURL,
        });

        alert("Product added 🌿");
      }

      resetForm();
      fetchProducts();

    } catch (error) {
      console.error("Submit error:", error);
      alert("Something went wrong ❌");
    }
  };

  /* ===============================
     🧹 Reset Form
  =============================== */
  const resetForm = () => {
    setName("");
    setPrice("");
    setStock("");
    setImageFile(null);
    setEditingId(null);
  };

  /* ===============================
     ❌ Delete Product
  =============================== */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin Product Management 🌿</h1>

      {/* ================= FORM ================= */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "400px",
        }}
      >
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          type="number"
          placeholder="Stock Quantity"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />

        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: editingId ? "#1976d2" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {editingId ? "Update Product" : "Add Product"}
        </button>
      </form>

      {/* ================= PRODUCTS GRID ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              textAlign: "center",
            }}
          >
            <img
              src={product.image}
              alt={product.name}
              style={{ width: "100%", borderRadius: "8px" }}
            />

            <h4>{product.name}</h4>
            <p>₹ {product.price}</p>
            <p>Stock: {product.stock}</p>

            <button
              onClick={() => {
                setName(product.name);
                setPrice(product.price);
                setStock(product.stock);
                setEditingId(product.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                marginRight: "5px",
                padding: "5px 10px",
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>

            <button
              onClick={() => handleDelete(product.id)}
              style={{
                padding: "5px 10px",
                backgroundColor: "#c62828",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminProducts;