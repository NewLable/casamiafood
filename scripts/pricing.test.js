const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const pricing = require("../js/pricing.js");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/products.json"), "utf8"));

function total(product, qty, type) {
  return pricing.lineTotal(product, qty, type || product.quantityType, product.price);
}

test("grams are priced from the kilogram price", () => {
  const product = { price: 700, priceUnit: "kg", quantityType: "gram" };
  assert.equal(total(product, 500), 350);
  assert.equal(total(product, 1000), 700);
});

test("kilograms and packages stay a direct multiple", () => {
  assert.equal(total({ price: 700, priceUnit: "kg", quantityType: "kg" }, 1.5), 1050);
  assert.equal(total({ price: 900, priceUnit: "pack", quantityType: "package", weight: 1500, weightUnit: "ml" }, 2), 1800);
});

test("milliliters of a priced pack are a share of that pack", () => {
  const jar = { price: 900, priceUnit: "pack", quantityType: "ml", weight: 1500, weightUnit: "ml" };
  assert.equal(total(jar, 1500), 900);
  assert.equal(total(jar, 3000), 1800);
  assert.equal(total(jar, 2000), 1200);
});

test("a per-liter price converts milliliters and liters", () => {
  const soup = { price: 700, priceUnit: "l", weight: 1500, weightUnit: "ml" };
  assert.equal(total(soup, 1500, "ml"), 1050);
  assert.equal(total(soup, 1.5, "l"), 1050);
  assert.equal(total(soup, 1, "package"), 1050);
});

test("a per-milliliter price converts liters", () => {
  const soup = { price: 2, priceUnit: "ml", weight: 1.5, weightUnit: "l" };
  assert.equal(total(soup, 1500, "ml"), 3000);
  assert.equal(total(soup, 1.5, "l"), 3000);
  assert.equal(total(soup, 1, "package"), 3000);
});

test("borscht priced per kilogram converts milliliters like grams", () => {
  const beef = products.find((item) => item.id === "product-1792246662016");
  const chicken = products.find((item) => item.id === "product-1792246662016-copy");
  assert.equal(beef.priceUnit, "kg");
  assert.equal(chicken.priceUnit, "kg");
  assert.equal(beef.quantityType, "ml");
  assert.equal(chicken.quantityType, "ml");
  assert.equal(total(beef, 1500), 1350);
  assert.equal(total(chicken, 1500), 1050);
  assert.equal(total(beef, 2000), 1800);
  assert.notEqual(total(beef, 1500), 900 * 1500);
});

test("Forest Heart starts at half a kilogram", () => {
  const salad = products.find((item) => item.id === "salad-forest-heart");
  assert.equal(salad.min, 0.5);
  assert.equal(salad.step, 0.5);
  assert.equal(total(salad, 0.5), 350);
});

test("every catalog item stays in a sane price range", () => {
  const problems = [];
  for (const product of products) {
    const name = product.name.ru;
    const min = Number(product.min) || 1;
    const step = Number(product.step) || 1;
    const first = total(product, min);
    const second = total(product, min + step);
    const label = product.unit && product.unit.ru || "";
    if (!(first > 0) || first > product.price * 4) {
      problems.push(`${name}: minimum ${min} costs ${first}, price is ${product.price}`);
    }
    if (second > product.price * 6) {
      problems.push(`${name}: next step costs ${second}`);
    }
    if (product.weightUnit === "ml" && !["ml", "l", "package", "piece"].includes(product.quantityType)) {
      problems.push(`${name}: liquid weight with quantity ${product.quantityType}`);
    }
    if (/мл|ml/i.test(label) && product.quantityType !== "ml") {
      problems.push(`${name}: label ${label} but quantity ${product.quantityType}`);
    }
    if (product.priceUnit === "kg" && product.quantityType === "kg") {
      const expected = Math.round(product.price * min);
      if (first !== expected) problems.push(`${name}: ${first} instead of ${expected}`);
    }
    if (product.quantityType === "package") {
      if (first !== product.price) problems.push(`${name}: one pack costs ${first}`);
      for (const variant of product.variants || []) {
        const variantTotal = pricing.lineTotal(product, 1, "package", variant.price);
        if (variantTotal !== variant.price) {
          problems.push(`${name} ${variant.id}: variant costs ${variantTotal}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});
