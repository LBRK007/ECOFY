import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';

test('renders ECOFY welcome heading', () => {
  render(
    <CartProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </CartProvider>
  );
  const heading = screen.getByText(/Welcome to ECOFY/i);
  expect(heading).toBeInTheDocument();
});

test('renders Shop Now button on home page', () => {
  render(
    <CartProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </CartProvider>
  );
  const button = screen.getByRole('button', { name: /shop now/i });
  expect(button).toBeInTheDocument();
});