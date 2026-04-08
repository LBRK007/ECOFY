import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Admin from "./pages/Admin";
import AdminProducts from "./pages/AdminProducts";
import ProductDetails from "./pages/ProductDetails";
import CompletedOrders from "./pages/CompletedOrders";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import ActiveOrders from "./pages/ActiveOrders";
import ScrollToTop from "./components/ScrollToTop";
import { WishlistProvider } from "./context/WishlistContext";




function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        

        {/* 🔐 Protected User Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/adminproducts"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminProducts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/completed-orders"
          element={
            <ProtectedRoute adminOnly={true}>
              <CompletedOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-orders"
          element={
            <ProtectedRoute adminOnly={true}>
              <ActiveOrders />
            </ProtectedRoute>
          }
        />
         <Route path="/checkout" element={<Checkout />} />

      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <WishlistProvider> 
      <Navbar />
      <ScrollToTop />
      <MainContent />
      <BottomNav />
      </WishlistProvider>
    </Router>
  );
}

function MainContent() {
  const location = useLocation();

  // List of routes where you want the footer to show
  const footerRoutes = ['/', '/products', '/profile',];

  return (
    <>
      <main style={{ paddingTop: '70px' }}>
        <AnimatedRoutes />
      </main>
      
      {/* Render footer only on specific routes */}
      {footerRoutes.includes(location.pathname) && <Footer />}
    </>
  );
}

export default App;