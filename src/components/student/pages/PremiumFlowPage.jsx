import React from "react";
import { ArrowLeft, Check, Crown, LockKeyhole, ShoppingCart, Sparkles } from "lucide-react";
import "./PremiumFlowPage.css";

const plans = [
  { id: "monthly", name: "Monthly Plan", price: 150, period: "month", detail: "Flexible monthly access" },
  { id: "quarterly", name: "Quarterly Plan", price: 400, period: "3 months", detail: "Save ₹50 over three monthly payments" },
  { id: "yearly", name: "Yearly Plan", price: 1500, period: "year", detail: "Best value for a full year" },
];

const money = (amount) => `₹${amount.toLocaleString("en-IN")}`;

export const PremiumFlowPage = ({ t, signedIn, studentEmail, studentName, cartPlan, checkoutOpen, onAddToCart, onRemoveFromCart, onBeginCheckout, onBackToPlans }) => {
  const selectedPlan = plans.find((plan) => plan.id === cartPlan);

  return (
    <section className="premium-flow-page">
      <div className="premium-flow-wrap">
        <header className="premium-flow-heading">
          <span className="premium-flow-eyebrow"><Crown size={16} /> B2C INDIVIDUALS</span>
          <h1>Make room for your next breakthrough.</h1>
          <p>Choose a flexible Cogni-Flow plan for focused, confidence-building learning.</p>
        </header>

        {checkoutOpen ? (
          <div className="premium-checkout-card">
            <button className="premium-back-button" type="button" onClick={onBackToPlans}><ArrowLeft size={17} /> Back to plans</button>
            <h2>Checkout</h2>
            {!selectedPlan ? (
              <div className="premium-empty-cart"><ShoppingCart size={24} /><p>Your cart is empty. Choose a plan to continue.</p><button type="button" onClick={onBackToPlans}>View plans</button></div>
            ) : <>
              <div className="premium-order-row"><div><strong>{selectedPlan.name}</strong><span>Premium Flow · {selectedPlan.period}</span></div><strong>{money(selectedPlan.price)}</strong></div>
              <div className="premium-order-row premium-order-total"><strong>Total</strong><strong>{money(selectedPlan.price)}</strong></div>
              {signedIn ? <div className="premium-account-note"><Check size={17} /> Signed in as {studentEmail || studentName}</div> : <div className="premium-account-note"><LockKeyhole size={17} /> Sign in to continue to checkout.</div>}
              <div className="premium-payment-note"><strong>Payment setup is coming soon</strong><span>Your plan is selected, but payments are not connected yet. You will not be charged.</span></div>
              <button className="premium-pay-button" type="button" disabled>{signedIn ? "Payment unavailable" : "Sign in to checkout"}</button>
              <button className="premium-remove-button" type="button" onClick={onRemoveFromCart}>Remove plan from cart</button>
            </>}
          </div>
        ) : <>
          <div className="premium-plan-grid">
            {plans.map((plan, index) => <article className={`premium-plan-card ${index === 1 ? "featured" : ""}`} key={plan.id}>
              {index === 1 && <span className="premium-popular">MOST POPULAR</span>}
              <div className="premium-plan-icon"><Sparkles size={20} /></div>
              <h2>{plan.name}</h2>
              <p className="premium-plan-price">{money(plan.price)}<span> / {plan.period}</span></p>
              <p className="premium-plan-detail">{plan.detail}</p>
              <ul><li><Check size={16} /> Premium Cogni-Flow access</li><li><Check size={16} /> Cancel or change any time</li></ul>
              <button type="button" className={cartPlan === plan.id ? "premium-added-button" : "premium-add-button"} onClick={() => onAddToCart(plan.id)}>
                {cartPlan === plan.id ? <><Check size={17} /> Added to cart</> : <><ShoppingCart size={17} /> Add to cart</>}
              </button>
            </article>)}
          </div>
          <div className="premium-cart-bar">
            <div><ShoppingCart size={20} /><span><strong>{selectedPlan ? "1 item in cart" : "Your cart is empty"}</strong><small>{selectedPlan ? `${selectedPlan.name} · ${money(selectedPlan.price)}` : "Select a plan to get started"}</small></span></div>
            <button type="button" disabled={!selectedPlan} onClick={onBeginCheckout}>Go to checkout <ArrowLeft className="premium-checkout-arrow" size={17} /></button>
          </div>
        </>}
        <p className="premium-flow-footnote">Individual plans are billed in Indian rupees. Checkout requires a student account.</p>
      </div>
    </section>
  );
};
