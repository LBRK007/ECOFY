import React, { useEffect, useState } from 'react';
import './Home.css';
import { Link } from "react-router-dom";
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/* ── Scroll fade-up hook ──────────────────────────── */
function useFadeUp() {
  useEffect(() => {
    const els = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ── Data ─────────────────────────────────────────── */
const products = [
  {
    icon: '🪥',
    name: 'Bamboo Toothbrush',
    tagline: 'Gentle on teeth, tough on plaque.',
    features: ['Soft bristles', 'Natural bamboo handle', 'Eco-friendly design'],
  },
  {
    icon: '💆',
    name: 'Bamboo Hair Brush',
    tagline: 'Care for your hair naturally.',
    features: ['Reduces static', 'Smooth detangling', 'Scalp-friendly'],
  },
  {
    icon: '🧹',
    name: 'Bamboo Cleaning Brush',
    tagline: 'Perfect for everyday cleaning.',
    features: ['Strong bristles', 'Durable design', 'Multipurpose use'],
  },
  {
    icon: '✨',
    name: 'Bamboo Face Brush',
    tagline: 'Refresh your skin naturally.',
    features: ['Gentle exfoliation', 'Improves skin texture', 'All skin types'],
  },
];

const whyFeatures = [
  { icon: '🌱', name: '100% Eco-Friendly Materials', desc: 'Every product is crafted from sustainably sourced bamboo.' },
  { icon: '♻️', name: 'Biodegradable Packaging',     desc: 'From product to package — zero plastic, zero guilt.' },
  { icon: '🏭', name: 'Sustainable Production',       desc: 'Ethical manufacturing with a minimal carbon footprint.' },
  { icon: '💎', name: 'High Quality & Durable',       desc: 'Built to last without compromising on sustainability.' },
  { icon: '💚', name: 'Affordable Prices',            desc: 'Going green should never cost the earth.' },
];

const whyStats = [
  { num: '50K+', label: 'Happy Customers' },
  { num: '98%',  label: 'Plastic Reduced' },
  { num: '4.9★', label: 'Average Rating' },
  { num: '100%', label: 'Natural Materials' },
];

const reviews = [
  { stars: '⭐⭐⭐⭐⭐', text: 'Great quality and eco-friendly! I love using bamboo toothbrushes now. Never going back to plastic.', name: 'Sarah M.', tag: 'Verified Buyer', avatar: '🌿' },
  { stars: '⭐⭐⭐⭐⭐', text: 'Strong, stylish, and sustainable. The hair brush is absolutely beautiful — highly recommended!',       name: 'James K.', tag: 'Verified Buyer', avatar: '🎋' },
  { stars: '⭐⭐⭐⭐⭐', text: 'The face brush is incredibly gentle. My skin has never looked better and I feel good about my choices.', name: 'Amara L.', tag: 'Verified Buyer', avatar: '🌸' },
  { stars: '⭐⭐⭐⭐⭐', text: 'Fast shipping, gorgeous packaging, and the cleaning brush works like a charm. Will order again!',       name: 'Theo W.',  tag: 'Verified Buyer', avatar: '🍃' },
];

/* ── Subscribe Modal ──────────────────────────────── */
function SubscribeModal({ onClose }) {
  const [form, setForm]       = useState({ email: '', phone: '', age: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Please enter a valid email address.';
    if (!form.phone.match(/^\+?[0-9\s-]{7,15}$/))        e.phone = 'Please enter a valid phone number.';
    if (!form.age || form.age < 1 || form.age > 120)      e.age   = 'Please enter a valid age (1–120).';
    return e;
  };

  const handleChange = (field) => (ev) => {
    setForm(f => ({ ...f, [field]: ev.target.value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, 'subscribers'), {
        email:     form.email.trim().toLowerCase(),
        phone:     form.phone.trim(),
        age:       Number(form.age),
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err) {
      console.error('Firestore error:', err);
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* close on backdrop click */
  const handleBackdrop = (ev) => { if (ev.target === ev.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal-box">

        {success ? (
          /* ── Thank you state ── */
          <div className="modal-thankyou">
            <div className="modal-ty-icon">🌿</div>
            <h2 className="modal-ty-title">Thank You!</h2>
            <p className="modal-ty-sub">
              You're now part of the ECOFY green movement.<br />
              We'll keep you updated with eco tips and new products.
            </p>
            <button className="modal-btn" onClick={onClose}>Back to Home</button>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

            <div className="modal-header">
              <div className="modal-icon">📩</div>
              <h2 className="modal-title">Stay Green with Us</h2>
              <p className="modal-sub">Join our eco-community and get updates on new products and sustainability tips.</p>
            </div>

            <div className="modal-fields">
              {/* Email */}
              <div className="modal-field">
                <label className="modal-label">Gmail / Email</label>
                <input
                  className={`modal-input${errors.email ? ' modal-input--err' : ''}`}
                  type="email"
                  placeholder="you@gmail.com"
                  value={form.email}
                  onChange={handleChange('email')}
                />
                {errors.email && <span className="modal-err">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="modal-field">
                <label className="modal-label">Phone Number</label>
                <input
                  className={`modal-input${errors.phone ? ' modal-input--err' : ''}`}
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={handleChange('phone')}
                />
                {errors.phone && <span className="modal-err">{errors.phone}</span>}
              </div>

              {/* Age */}
              <div className="modal-field">
                <label className="modal-label">Age</label>
                <input
                  className={`modal-input${errors.age ? ' modal-input--err' : ''}`}
                  type="number"
                  placeholder="e.g. 25"
                  min="1"
                  max="120"
                  value={form.age}
                  onChange={handleChange('age')}
                />
                {errors.age && <span className="modal-err">{errors.age}</span>}
              </div>

              {errors.submit && <span className="modal-err modal-err--center">{errors.submit}</span>}
            </div>

            <button
              className="modal-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '🌿 Subscribing...' : 'Subscribe 🌿'}
            </button>

            <p className="modal-privacy">🔒 Your data is private and never shared.</p>
          </>
        )}

      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────── */
export default function Home() {
  useFadeUp();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="home">

      {/* ── Subscribe Modal ── */}
      {showModal && <SubscribeModal onClose={() => setShowModal(false)} />}

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-pattern" />
        <span className="hero-leaf-1">🌿</span>
        <span className="hero-leaf-2">🎋</span>
        <span className="hero-leaf-3">🍃</span>

        <div className="hero-content">
          <div className="hero-badge">🌱 100% Natural &amp; Sustainable</div>
          <h1 className="hero-headline">
            Switch to <em>Sustainable</em><br />Living with Bamboo
          </h1>
          <p className="hero-sub">
            Eco-friendly. Biodegradable. Better for you and the planet.
            Every brush is a step toward a greener tomorrow.
          </p>
          <div className="hero-buttons">
            <Link to="/products" className="btn-primary">🛒 Shop Now</Link>
            <Link to="/about"    className="btn-outline">Learn More →</Link>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">50K+</div>
            <div className="hero-stat-label">Happy Customers</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">4.9★</div>
            <div className="hero-stat-label">Average Rating</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">100%</div>
            <div className="hero-stat-label">Natural Materials</div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="about" id="about">
        <div className="about-visual fade-up">
          <div className="about-card-main">
            <div className="about-card-icon">🎋</div>
            <div className="about-card-stat">3×</div>
            <div className="about-card-desc">Faster growing than any hardwood timber, bamboo is nature's most renewable resource.</div>
          </div>
          <div className="about-card-float">
            <div className="about-card-float-icon">🌍</div>
            <div className="about-card-float-text">
              <strong>Planet First</strong>
              <span>Zero plastic in every product</span>
            </div>
          </div>
        </div>

        <div className="about-text fade-up">
          <div className="section-tag">🌿 Why Bamboo?</div>
          <h2 className="about-headline">Nature's Most<br />Powerful Plant</h2>
          <p className="about-body">
            Bamboo is a fast-growing, natural material that is biodegradable and
            environmentally friendly. Our bamboo brushes are designed to replace
            plastic alternatives, helping you live a more sustainable lifestyle
            without compromising quality.
          </p>
          <div className="about-pills">
            <span className="about-pill">🌱 Biodegradable</span>
            <span className="about-pill">💧 Water-Efficient</span>
            <span className="about-pill">🌿 Renewably Sourced</span>
            <span className="about-pill">♻️ Zero Waste</span>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="products" id="products">
        <div className="section-header fade-up">
          <div className="section-tag">🪥 Our Products</div>
          <h2 className="section-headline">Crafted with Nature in Mind</h2>
          <p className="section-sub">Every brush tells a story of sustainability, quality, and care for the world we share.</p>
        </div>

        <div className="products-grid">
          {products.map((p, i) => (
            <div className="product-card fade-up" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="product-icon">{p.icon}</div>
              <div className="product-name">{p.name}</div>
              <div className="product-tagline">{p.tagline}</div>
              <ul className="product-features">
                {p.features.map((f, j) => (
                  <li className="product-feature" key={j}>
                    <span className="product-feature-dot" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="products-cta fade-up">
          <Link to="/products">
            <button className="btn-green" id="shop">View All Products →</button>
          </Link>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="why" id="why">
        <div className="why-text">
          <div className="section-tag">💚 Why Choose Us</div>
          <h2 className="why-headline">We Put the<br />Planet First</h2>
          <p className="why-sub">
            Every decision we make — from material sourcing to packaging — is guided by one question: is this better for the Earth?
          </p>
          <div className="why-features">
            {whyFeatures.map((f, i) => (
              <div className="why-feature fade-up" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="why-feature-icon">{f.icon}</div>
                <div>
                  <div className="why-feature-name">{f.name}</div>
                  <div className="why-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="why-visual fade-up">
          {whyStats.map((s, i) => (
            <div className="why-visual-card" key={i}>
              <div className="why-visual-num">{s.num}</div>
              <div className="why-visual-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="mission">
        <div className="section-tag fade-up">♻️ Our Mission</div>
        <blockquote className="mission-quote fade-up">
          We aim to reduce plastic waste and promote eco-friendly living by
          providing sustainable alternatives for everyday products.
        </blockquote>
        <p className="mission-author fade-up">— The ECOFY Team</p>
      </section>

      {/* ── Reviews ── */}
      <section className="reviews" id="reviews">
        <div className="section-header fade-up">
          <div className="section-tag">💬 Customer Reviews</div>
          <h2 className="section-headline">Loved by Thousands</h2>
          <p className="section-sub">Real people, real results. Here's what our community is saying.</p>
        </div>
        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <div className="review-card fade-up" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="review-stars">{r.stars}</div>
              <p className="review-text">"{r.text}"</p>
              <div className="review-author">
                <div className="review-avatar">{r.avatar}</div>
                <div>
                  <div className="review-name">{r.name}</div>
                  <div className="review-tag">{r.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <div className="section-tag fade-up" style={{ background: 'rgba(168,213,181,0.15)', color: '#a8d5b5' }}>
          🌍 Make the Change Today
        </div>
        <h2 className="cta-headline fade-up">Join the Eco-Friendly<br />Movement</h2>
        <p className="cta-sub fade-up">Switch to bamboo and take the first step toward a cleaner, greener planet.</p>
        <div className="hero-buttons fade-up">
          <Link to="/products" className="btn-primary1">🛒 Shop Now</Link>
          <Link to="/about"    className="btn-outline1">Learn More →</Link>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="newsletter">
        <div className="section-tag fade-up">📩 Stay in the Loop</div>
        <h2 className="newsletter-headline fade-up">Stay Green with Us</h2>
        <p className="newsletter-sub fade-up">Get updates on new products and eco tips delivered to your inbox.</p>
        <div className="newsletter-form fade-up">
          <button className="newsletter-btn" onClick={() => setShowModal(true)}>
            Subscribe 🌿
          </button>
        </div>
      </section>

    </div>
  );
}