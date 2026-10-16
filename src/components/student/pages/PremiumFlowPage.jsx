import React from "react";
import { ArrowLeft, Check, Crown, LockKeyhole, ShoppingCart, Sparkles } from "lucide-react";
import "./PremiumFlowPage.css";

const plans = [
  { id: "monthly", price: 150 },
  { id: "quarterly", price: 400 },
  { id: "yearly", price: 1500 },
];

const money = (amount) => new Intl.NumberFormat(document.documentElement.lang || "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export const PremiumFlowPage = ({ t, signedIn, studentEmail, studentName, cartPlan, checkoutOpen, onAddToCart, onRemoveFromCart, onBeginCheckout, onBackToPlans }) => {
  const selectedPlan = plans.find((plan) => plan.id === cartPlan);

  return (
    <section className="premium-flow-page">
      <div className="premium-flow-wrap">
        <header className="premium-flow-heading">
          <span className="premium-flow-eyebrow"><Crown size={16} /> {t("individualPlans")}</span>
          <h1>{t("premiumHeading")}</h1>
          <p>{t("premiumDescription")}</p>
        </header>

        {checkoutOpen ? (
          <div className="premium-checkout-card">
            <button className="premium-back-button" type="button" onClick={onBackToPlans}><ArrowLeft size={17} /> {t("backToPlans")}</button>
            <h2>{t("checkout")}</h2>
            {!selectedPlan ? (
              <div className="premium-empty-cart"><ShoppingCart size={24} /><p>{t("emptyCartChoosePlan")}</p><button type="button" onClick={onBackToPlans}>{t("viewPlans")}</button></div>
            ) : <>
              <div className="premium-order-row"><div><strong>{t(`${selectedPlan.id}Plan`)}</strong><span>{t("premiumFlow")} · {t(`${selectedPlan.id}Period`)}</span></div><strong>{money(selectedPlan.price)}</strong></div>
              <div className="premium-order-row premium-order-total"><strong>{t("total")}</strong><strong>{money(selectedPlan.price)}</strong></div>
              {signedIn ? <div className="premium-account-note"><Check size={17} /> {t("signedInAs")} {studentEmail || studentName}</div> : <div className="premium-account-note"><LockKeyhole size={17} /> {t("signInCheckout")}</div>}
              <div className="premium-payment-note"><strong>{t("paymentComingSoon")}</strong><span>{t("paymentNotConnected")}</span></div>
              <button className="premium-pay-button" type="button" disabled>{signedIn ? t("paymentUnavailable") : t("signInCheckoutButton")}</button>
              <button className="premium-remove-button" type="button" onClick={onRemoveFromCart}>{t("removePlan")}</button>
            </>}
          </div>
        ) : <>
          <div className="premium-plan-grid">
            {plans.map((plan, index) => <article className={`premium-plan-card ${index === 1 ? "featured" : ""}`} key={plan.id}>
              {index === 1 && <span className="premium-popular">{t("mostPopular")}</span>}
              <div className="premium-plan-icon"><Sparkles size={20} /></div>
              <h2>{t(`${plan.id}Plan`)}</h2>
              <p className="premium-plan-price">{money(plan.price)}<span> / {t(`${plan.id}Period`)}</span></p>
              <p className="premium-plan-detail">{t(`${plan.id}Detail`)}</p>
              <ul><li><Check size={16} /> {t("premiumAccess")}</li><li><Check size={16} /> {t("cancelOrChangeAnytime")}</li></ul>
              <button type="button" className={cartPlan === plan.id ? "premium-added-button" : "premium-add-button"} onClick={() => onAddToCart(plan.id)}>
                {cartPlan === plan.id ? <><Check size={17} /> {t("addedToCart")}</> : <><ShoppingCart size={17} /> {t("addToCart")}</>}
              </button>
            </article>)}
          </div>
          <div className="premium-cart-bar">
            <div><ShoppingCart size={20} /><span><strong>{selectedPlan ? t("oneCartItem") : t("cartEmpty")}</strong><small>{selectedPlan ? `${t(`${selectedPlan.id}Plan`)} · ${money(selectedPlan.price)}` : t("selectPlanToStart")}</small></span></div>
            <button type="button" disabled={!selectedPlan} onClick={onBeginCheckout}>{t("goToCheckout")} <ArrowLeft className="premium-checkout-arrow" size={17} /></button>
          </div>
        </>}
        <p className="premium-flow-footnote">{t("premiumFootnote")}</p>
      </div>
    </section>
  );
};
