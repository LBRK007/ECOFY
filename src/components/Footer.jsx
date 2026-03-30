import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand-name">ECO<span>FY</span></div>
          <p className="footer-brand-desc">
            Nature in Your Hands. We believe sustainable living starts with the small choices —
            like the brush you pick up every morning.
          </p>

          <div className="footer-socials">
            <div className="footer-social">🐦</div>
            <div className="footer-social">📸</div>
            <div className="footer-social">👍</div>
            <div className="footer-social">🎵</div>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Shop</div>
          <ul className="footer-links">
            <li>Toothbrushes</li>
            <li>Hair Brushes</li>
            <li>Cleaning Brushes</li>
            <li>Face Brushes</li>
            <li>All Products</li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Company</div>
          <ul className="footer-links">
            <li>About Us</li>
            <li>Our Mission</li>
            <li>Blog</li>
            <li>Contact</li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Support</div>
          <ul className="footer-links">
            <li>FAQ</li>
            <li>Shipping</li>
            <li>Returns</li>
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 ECOFY. All rights reserved 🌿</span>
        <div className="footer-bottom-right">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Cookies</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;