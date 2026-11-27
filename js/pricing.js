/**
 * Casa Mia price math for weight and volume.
 * Grams are charged from a per-kilogram price.
 * Milliliters are charged from a per-liter price, or as a share of the pack
 * when the price is for the whole container. A soup pack is 1.5 L at the
 * listed price; each extra 0.75 L is half of that price.
 * Works in the browser (window.CasaMiaPricing) and in Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CasaMiaPricing = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function packageMl(product) {
    const amount = Number(product && product.weight) || 0;
    const unit = product && product.weightUnit;
    if (unit === "l") return amount * 1000;
    if (unit === "ml") return amount;
    return 0;
  }

  function priceMultiplier(product, qty, quantityType) {
    const priceUnit = (product && product.priceUnit) || "pack";
    const type = quantityType || "package";
    const n = Number(qty) || 0;

    if (priceUnit === "kg") {
      if (type === "gram" || type === "ml") return n / 1000;
      if (type === "l") return n;
      return n;
    }

    if (priceUnit === "l") {
      if (type === "ml") return n / 1000;
      if (type === "l") return n;
      if (type === "package" || type === "piece") {
        const ml = packageMl(product);
        if (ml > 0) return (n * ml) / 1000;
      }
      return n;
    }

    if (priceUnit === "ml") {
      if (type === "l") return n * 1000;
      if (type === "ml") return n;
      if (type === "package" || type === "piece") {
        const ml = packageMl(product);
        if (ml > 0) return n * ml;
      }
      return n;
    }

    if (type === "ml" || type === "l") {
      const pack = packageMl(product);
      const ordered = type === "l" ? n * 1000 : n;
      if (pack > 0) return ordered / pack;
    }

    return n;
  }

  function lineTotal(product, qty, quantityType, unitPrice) {
    const price = Number(unitPrice);
    const base = Number.isFinite(price) ? price : Number(product && product.price) || 0;
    return Math.round(base * priceMultiplier(product, qty, quantityType));
  }

  return { packageMl, priceMultiplier, lineTotal };
});
