import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function AdminProducts() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const ADMIN_EMAIL = "irfanmk@gmail.com"; // Your admin email

  // 🔐 Admin Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied ❌");
        navigate("/");
        return;
      }
      fetchProducts();
    });

    return () => unsubscribe();
  }, [navigate]);

  // 🔄 Fetch products from Firestore
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(list);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
    setLoading(false);
  };

  // ☁️ Add product with Cloudinary upload
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !imageFile) {
      alert("Please fill all fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "ecofy_upload"); // Cloudinary preset

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/ddhewvyxh/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      const imageURL = data.secure_url;

      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        image: imageURL,
      });

      setName("");
      setPrice("");
      setImageFile(null);
      fetchProducts();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading product image");
    }
  };

  // ❌ Delete Product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Loading products...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin Product Management 🌿</h1>

      {/* Add Product Form */}
      <form
        onSubmit={handleAddProduct}
        style={{ marginBottom: "30px", display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          required
        />

        <button
          type="submit"
          style={{
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Product
        </button>
      </form>

      {/* Product List */}
      <h2>All Products</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img src={product.image} alt={product.name} style={{ width: "100%", borderRadius: "8px" }} />
            <h4>{product.name}</h4>
            <p>₹ {product.price}</p>
            <button
              onClick={() => handleDelete(product.id)}
              style={{
                padding: "5px 10px",
                backgroundColor: "#c62828",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "5px",
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