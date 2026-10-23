// Every demo purchase made from an account, oldest first. Subscriptions saved before
// purchase history existed only remember their latest purchase.
export const premiumPurchaseHistory = (subscription) => {
  if (Array.isArray(subscription?.purchases)) return subscription.purchases;
  if (!subscription?.purchasedAt) return [];
  return [{ planId: subscription.planId, purchasedAt: subscription.purchasedAt, paymentType: subscription.paymentType }];
};
