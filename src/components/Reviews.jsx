import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import StarRating from "./StarRating";
import { useToast } from "../hooks/useToast";

/**
 * Reviews — drop this into ProductDetails.
 * Props:
 *   productId  {string}  — Firestore product doc ID
 *   onStatsChange {function} — called with { average, count } when reviews update
 */
function Reviews({ productId, onStatsChange }) {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);   // existing review by this user
  const [myReviewDocId, setMyReviewDocId] = useState(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Gate: has the user received a delivered order with this product?
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* ── Live reviews via onSnapshot ── */
  useEffect(() => {
    if (!productId) return;

    const q = query(
      collection(db, "reviews"),
      where("productId", "==", productId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

      setReviews(list);

      // Bubble up stats to parent (ProductDetails / Products)
      if (onStatsChange) {
        const avg =
          list.length > 0
            ? list.reduce((s, r) => s + r.rating, 0) / list.length
            : 0;
        onStatsChange({ average: avg, count: list.length });
      }
    });

    return () => unsub();
  }, [productId, onStatsChange]);

  /* ── Check if logged-in user already reviewed & if they're eligible ── */
  useEffect(() => {
  if (!user || !productId) {
    setCheckingEligibility(false);
    return;
  }

  const checkEligibility = async () => {
    setCheckingEligibility(true);
    try {
      const existingQ = query(
        collection(db, "reviews"),
        where("productId", "==", productId),
        where("userId", "==", user.uid)
      );
      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        setMyReview(existing.data());
        setMyReviewDocId(existing.id);
        setRating(existing.data().rating);
        setComment(existing.data().comment);
      }

      const ordersQ = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        where("status", "==", "Delivered")
      );
      const ordersSnap = await getDocs(ordersQ);
      const purchased = ordersSnap.docs.some((orderDoc) =>
        (orderDoc.data().items || []).some((item) => item.id === productId)
      );
      setCanReview(purchased);
    } catch (err) {
      console.error("Eligibility check error:", err);
    }
    setCheckingEligibility(false);
  };

  checkEligibility();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user, productId]);

  /* ── Submit / update review ── */
  const handleSubmit = async () => {
    if (rating === 0) {
      toast("Please select a star rating.", "warning");
      return;
    }
    if (!comment.trim()) {
      toast("Please write a short review.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      if (myReviewDocId) {
        // Edit existing review
        await updateDoc(doc(db, "reviews", myReviewDocId), {
          rating,
          comment: comment.trim(),
          updatedAt: Timestamp.now(),
        });
        toast("Review updated ✅", "success");
      } else {
        // New review
        await addDoc(collection(db, "reviews"), {
          productId,
          userId: user.uid,
          userEmail: user.email,
          rating,
          comment: comment.trim(),
          createdAt: Timestamp.now(),
        });
        toast("Review submitted 🌿", "success");
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Review submit error:", err);
      toast("Failed to submit review. Try again.", "error");
    }
    setSubmitting(false);
  };

  /* ── Render ── */
  return (
    <div style={{ marginTop: "50px" }}>
      <ToastContainer />
      <h2 style={{ fontSize: "20px", marginBottom: "24px", color: "#2E7D32" }}>
        Customer Reviews
      </h2>

      {/* ── Review form ── */}
      {!user ? (
        <div style={styles.gateBox}>
          <p style={{ margin: "0 0 10px", color: "#555" }}>
            <button
              onClick={() => navigate("/login")}
              style={{ color: "#2E7D32", cursor: "pointer", fontWeight: "500" }}
            >
              Log in
            </button>{" "}
            to leave a review.
          </p>
        </div>
      ) : checkingEligibility ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Checking eligibility...</p>
      ) : !canReview ? (
        <div style={styles.gateBox}>
          <p style={{ margin: 0, color: "#777", fontSize: "14px" }}>
            Only customers with a delivered order of this product can leave a review.
          </p>
        </div>
      ) : myReview && !isEditing ? (
        /* Already reviewed — show their review with an edit button */
        <div style={styles.myReviewBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ margin: 0, fontWeight: "500", fontSize: "14px" }}>Your review</p>
            <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
              Edit
            </button>
          </div>
          <StarRating rating={myReview.rating} size={18} />
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#444" }}>
            {myReview.comment}
          </p>
        </div>
      ) : (
        /* Review form (new or editing) */
        <div style={styles.formBox}>
          <p style={{ margin: "0 0 12px", fontWeight: "500", fontSize: "15px" }}>
            {myReviewDocId ? "Edit your review" : "Write a review"}
          </p>

          <div style={{ marginBottom: "14px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#666" }}>
              Your rating
            </p>
            <StarRating rating={rating} onChange={setRating} size={28} />
          </div>

          <textarea
            placeholder="Share your experience with this product..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            style={styles.textarea}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={styles.submitBtn}
            >
              {submitting
                ? "Submitting..."
                : myReviewDocId
                ? "Update Review"
                : "Submit Review"}
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} style={styles.cancelBtn}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Review list ── */}
      <div style={{ marginTop: "32px" }}>
        {reviews.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "14px" }}>
            No reviews yet. Be the first!
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              style={{
                ...styles.reviewCard,
                // Highlight the current user's review
                border:
                  review.userId === user?.uid
                    ? "1px solid #c8e6c9"
                    : "0.5px solid #eee",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div>
                  <StarRating rating={review.rating} size={15} />
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>
                    {review.userEmail}
                    {review.userId === user?.uid && (
                      <span style={styles.youBadge}>You</span>
                    )}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#bbb" }}>
                  {review.createdAt?.toDate().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
                {review.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  gateBox: {
    padding: "16px 18px",
    background: "#f9f9f9",
    borderRadius: "10px",
    border: "0.5px solid #eee",
    marginBottom: "8px",
  },
  myReviewBox: {
    padding: "16px 18px",
    background: "#f1f8e9",
    borderRadius: "10px",
    border: "1px solid #c8e6c9",
    marginBottom: "8px",
  },
  formBox: {
    padding: "20px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    marginBottom: "8px",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.6",
  },
  submitBtn: {
    padding: "10px 22px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
  },
  cancelBtn: {
    padding: "10px 18px",
    background: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  editBtn: {
    padding: "5px 14px",
    background: "#fff",
    color: "#2E7D32",
    border: "1px solid #a5d6a7",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  reviewCard: {
    background: "#fff",
    padding: "16px 18px",
    borderRadius: "12px",
    marginBottom: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  youBadge: {
    marginLeft: "8px",
    padding: "1px 8px",
    background: "#e8f5e9",
    color: "#2E7D32",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "500",
  },
};

export default Reviews;