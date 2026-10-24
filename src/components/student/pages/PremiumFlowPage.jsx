import React from "react";
import { ArrowLeft, Check, Crown, LockKeyhole, ShoppingCart, Sparkles } from "lucide-react";
import "./PremiumFlowPage.css";

const plans = [
  { id: "monthly", nameKey: "pf_planMonthly", price: 299, periodKey: "pf_perMonth", detailKey: "pf_detailMonthly" },
  { id: "quarterly", nameKey: "pf_planQuarterly", price: 699, periodKey: "pf_per3Months", detailKey: "pf_detailQuarterly" },
  { id: "yearly", nameKey: "pf_planYearly", price: 1999, periodKey: "pf_perYear", detailKey: "pf_detailYearly" },
];

const money = (amount) => new Intl.NumberFormat(document.documentElement.lang || "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export const PremiumFlowPage = ({ t, signedIn, studentEmail, studentName, cartPlan, checkoutOpen, onAddToCart, onRemoveFromCart, onBeginCheckout, onCompletePurchase, onBackToPlans }) => {
  const selectedPlan = plans.find((plan) => plan.id === cartPlan);

  return (
    <section className="premium-flow-page">
      <div className="premium-flow-wrap">
        <header className="premium-flow-heading">
          <span className="premium-flow-eyebrow"><Crown size={16} /> {t("pf_eyebrow")}</span>
          <h1>{t("pf_title")}</h1>
          <p>{t("pf_subtitle")}</p>
        </header>

        {checkoutOpen ? (
          <div className="premium-checkout-card">
            <button className="premium-back-button" type="button" onClick={onBackToPlans}><ArrowLeft size={17} /> {t("pf_back")}</button>
            <h2>{t("pf_checkout")}</h2>
            {!selectedPlan ? (
              <div className="premium-empty-cart"><ShoppingCart size={24} /><p>{t("pf_emptyCart")}</p><button type="button" onClick={onBackToPlans}>{t("pf_viewPlans")}</button></div>
            ) : <>
              <div className="premium-order-row"><div><strong>{t(selectedPlan.nameKey)}</strong><span>{t("premiumFlow")} · {t(selectedPlan.periodKey)}</span></div><strong>{money(selectedPlan.price)}</strong></div>
              <div className="premium-order-row premium-order-total"><strong>{t("pf_total")}</strong><strong>{money(selectedPlan.price)}</strong></div>
              {signedIn ? <div className="premium-account-note"><Check size={17} /> {t("pf_signedInAs", { who: studentEmail || studentName })}</div> : <div className="premium-account-note"><LockKeyhole size={17} /> {t("pf_signInCheckout")}</div>}
              <div className="premium-payment-note"><strong>{t("pf_demoPaymentTitle")}</strong><span>{t("pf_demoPaymentCopy")}</span></div>
              <button className="premium-pay-button premium-demo-pay-button" type="button" disabled={!signedIn} onClick={() => onCompletePurchase(selectedPlan.id)}>{t(signedIn ? "pf_demoPurchase" : "pf_signInToCheckout")}</button>
              <button className="premium-remove-button" type="button" onClick={onRemoveFromCart}>{t("pf_remove")}</button>
            </>}
          </div>
        ) : <>
          <div className="premium-plan-grid">
            {plans.map((plan, index) => <article className={`premium-plan-card ${index === 1 ? "featured" : ""}`} key={plan.id}>
              {index === 1 && <span className="premium-popular">{t("pf_popular")}</span>}
              <div className="premium-plan-icon"><Sparkles size={20} /></div>
              <h2>{t(plan.nameKey)}</h2>
              <p className="premium-plan-price">{money(plan.price)}<span> / {t(plan.periodKey)}</span></p>
              <p className="premium-plan-detail">{t(plan.detailKey)}</p>
              <ul><li><Check size={16} /> {t("pf_feat1")}</li><li><Check size={16} /> {t("pf_feat2")}</li></ul>
              <button type="button" className={cartPlan === plan.id ? "premium-added-button" : "premium-add-button"} onClick={() => onAddToCart(plan.id)}>
                {cartPlan === plan.id ? <><Check size={17} /> {t("pf_added")}</> : <><ShoppingCart size={17} /> {t("pf_add")}</>}
              </button>
            </article>)}
          </div>
          <div className="premium-cart-bar">
            <div><ShoppingCart size={20} /><span><strong>{t(selectedPlan ? "pf_oneItem" : "pf_cartEmpty")}</strong><small>{selectedPlan ? `${t(selectedPlan.nameKey)} · ${money(selectedPlan.price)}` : t("pf_selectPlan")}</small></span></div>
            <button type="button" disabled={!selectedPlan} onClick={onBeginCheckout}>{t("pf_goCheckout")} <ArrowLeft className="premium-checkout-arrow" size={17} /></button>
          </div>
        </>}
        <p className="premium-flow-footnote">{t("pf_footnote")}</p>
      </div>
    </section>
  );
};
