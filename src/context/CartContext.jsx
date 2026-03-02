import { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export function CartProvider({ children }) {

  // ✅ Load cart from localStorage on first load
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("ecofyCart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // ✅ Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("ecofyCart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    const exist = cart.find((item) => item.id === product.id);

    if (exist) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...exist, quantity: exist.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const increaseQty = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQty = (id) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };
  const removeItem = (id) => {
  setCart(cart.filter((item) => item.id !== id));
};

  return (
    <CartContext.Provider
  value={{
    cart,
    addToCart,
    increaseQty,
    decreaseQty,
    removeItem
  }}
>
      {children}
    </CartContext.Provider>
  );
}