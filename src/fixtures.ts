// Fixture data — used when KROGER_CLIENT_ID / KROGER_CLIENT_SECRET are unset.
// Deterministic: the same query always returns the same products in the same order.

export interface Product {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  category: string;
  size: string;
  price: { regular: number; promo: number | null };
  aisle: string;
  stockLevel: "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK";
}

export const FIXTURE_LOCATION = {
  locationId: "01400943",
  name: "Fixture Market #943",
  address: "123 Demo Street, Cincinnati, OH 45202",
};

export const FIXTURE_PRODUCTS: Product[] = [
  { productId: "0001111041700", upc: "0001111041700", description: "Whole Milk, 1 Gallon", brand: "Simple Truth", category: "Dairy", size: "1 gal", price: { regular: 3.49, promo: 2.99 }, aisle: "Dairy Wall 2", stockLevel: "HIGH" },
  { productId: "0001111042850", upc: "0001111042850", description: "2% Reduced Fat Milk, Half Gallon", brand: "Kroger", category: "Dairy", size: "0.5 gal", price: { regular: 2.19, promo: null }, aisle: "Dairy Wall 2", stockLevel: "HIGH" },
  { productId: "0001111060903", upc: "0001111060903", description: "Large Grade A Eggs, 12 Count", brand: "Kroger", category: "Dairy", size: "12 ct", price: { regular: 2.89, promo: null }, aisle: "Dairy Wall 3", stockLevel: "HIGH" },
  { productId: "0001111087325", upc: "0001111087325", description: "Salted Butter Sticks, 1 lb", brand: "Kroger", category: "Dairy", size: "16 oz", price: { regular: 4.29, promo: 3.79 }, aisle: "Dairy Wall 3", stockLevel: "HIGH" },
  { productId: "0007225003706", upc: "0007225003706", description: "Sourdough Bread Loaf", brand: "Private Selection", category: "Bakery", size: "24 oz", price: { regular: 3.99, promo: null }, aisle: "Aisle 12 - Bakery", stockLevel: "HIGH" },
  { productId: "0001111008442", upc: "0001111008442", description: "100% Whole Wheat Bread", brand: "Kroger", category: "Bakery", size: "20 oz", price: { regular: 2.49, promo: 1.99 }, aisle: "Aisle 12 - Bakery", stockLevel: "HIGH" },
  { productId: "0000000004011", upc: "0000000004011", description: "Bananas, per lb", brand: "Fresh", category: "Produce", size: "1 lb", price: { regular: 0.59, promo: null }, aisle: "Produce 1", stockLevel: "HIGH" },
  { productId: "0000000004131", upc: "0000000004131", description: "Fuji Apples, per lb", brand: "Fresh", category: "Produce", size: "1 lb", price: { regular: 1.79, promo: 1.49 }, aisle: "Produce 2", stockLevel: "HIGH" },
  { productId: "0000000004062", upc: "0000000004062", description: "Cucumber, each", brand: "Fresh", category: "Produce", size: "1 ct", price: { regular: 0.89, promo: null }, aisle: "Produce 3", stockLevel: "HIGH" },
  { productId: "0000000004664", upc: "0000000004664", description: "Roma Tomatoes, per lb", brand: "Fresh", category: "Produce", size: "1 lb", price: { regular: 1.49, promo: null }, aisle: "Produce 3", stockLevel: "LOW" },
  { productId: "0001111091188", upc: "0001111091188", description: "Baby Spinach, 5 oz Clamshell", brand: "Simple Truth Organic", category: "Produce", size: "5 oz", price: { regular: 2.99, promo: null }, aisle: "Produce 4", stockLevel: "HIGH" },
  { productId: "0002100003563", upc: "0002100003563", description: "Creamy Peanut Butter", brand: "Jif", category: "Pantry", size: "16 oz", price: { regular: 3.29, promo: 2.79 }, aisle: "Aisle 5", stockLevel: "HIGH" },
  { productId: "0005150024322", upc: "0005150024322", description: "Strawberry Jam", brand: "Smucker's", category: "Pantry", size: "18 oz", price: { regular: 3.89, promo: null }, aisle: "Aisle 5", stockLevel: "HIGH" },
  { productId: "0001111086352", upc: "0001111086352", description: "Spaghetti Pasta", brand: "Kroger", category: "Pantry", size: "16 oz", price: { regular: 1.29, promo: 0.99 }, aisle: "Aisle 6", stockLevel: "HIGH" },
  { productId: "0002700038253", upc: "0002700038253", description: "Traditional Pasta Sauce", brand: "Prego", category: "Pantry", size: "24 oz", price: { regular: 2.79, promo: null }, aisle: "Aisle 6", stockLevel: "HIGH" },
  { productId: "0001111005152", upc: "0001111005152", description: "Long Grain White Rice", brand: "Kroger", category: "Pantry", size: "32 oz", price: { regular: 2.29, promo: null }, aisle: "Aisle 6", stockLevel: "HIGH" },
  { productId: "0004900005010", upc: "0004900005010", description: "Coca-Cola, 12 Pack Cans", brand: "Coca-Cola", category: "Beverages", size: "12 x 12 fl oz", price: { regular: 7.99, promo: 6.49 }, aisle: "Aisle 8", stockLevel: "HIGH" },
  { productId: "0001111000501", upc: "0001111000501", description: "Spring Water, 24 Pack", brand: "Kroger", category: "Beverages", size: "24 x 16.9 fl oz", price: { regular: 4.49, promo: null }, aisle: "Aisle 8", stockLevel: "HIGH" },
  { productId: "0007567100311", upc: "0007567100311", description: "Medium Roast Ground Coffee", brand: "Eight O'Clock", category: "Beverages", size: "12 oz", price: { regular: 8.99, promo: 7.49 }, aisle: "Aisle 7", stockLevel: "HIGH" },
  { productId: "0002310011036", upc: "0002310011036", description: "Boneless Skinless Chicken Breast, per lb", brand: "Heritage Farm", category: "Meat", size: "1 lb", price: { regular: 4.99, promo: 4.49 }, aisle: "Meat Counter", stockLevel: "HIGH" },
  { productId: "0002310012301", upc: "0002310012301", description: "93% Lean Ground Beef, per lb", brand: "Kroger", category: "Meat", size: "1 lb", price: { regular: 6.49, promo: null }, aisle: "Meat Counter", stockLevel: "HIGH" },
  { productId: "0004800001033", upc: "0004800001033", description: "Atlantic Salmon Fillet, per lb", brand: "Fresh Catch", category: "Seafood", size: "1 lb", price: { regular: 9.99, promo: 8.99 }, aisle: "Seafood Counter", stockLevel: "LOW" },
  { productId: "0001111079033", upc: "0001111079033", description: "Sharp Cheddar Cheese Block", brand: "Kroger", category: "Dairy", size: "8 oz", price: { regular: 2.99, promo: null }, aisle: "Dairy Wall 1", stockLevel: "HIGH" },
  { productId: "0001111052322", upc: "0001111052322", description: "Greek Nonfat Yogurt, Plain", brand: "Simple Truth", category: "Dairy", size: "32 oz", price: { regular: 4.79, promo: 4.29 }, aisle: "Dairy Wall 1", stockLevel: "HIGH" },
  { productId: "0003800031829", upc: "0003800031829", description: "Honey Nut Cheerios Cereal", brand: "General Mills", category: "Breakfast", size: "18.8 oz", price: { regular: 4.99, promo: 3.99 }, aisle: "Aisle 4", stockLevel: "HIGH" },
  { productId: "0001111008520", upc: "0001111008520", description: "Old Fashioned Rolled Oats", brand: "Kroger", category: "Breakfast", size: "42 oz", price: { regular: 3.49, promo: null }, aisle: "Aisle 4", stockLevel: "HIGH" },
  { productId: "0001111035732", upc: "0001111035732", description: "Frozen Broccoli Florets", brand: "Kroger", category: "Frozen", size: "12 oz", price: { regular: 1.69, promo: null }, aisle: "Frozen Aisle 14", stockLevel: "HIGH" },
  { productId: "0001111038612", upc: "0001111038612", description: "Vanilla Bean Ice Cream", brand: "Private Selection", category: "Frozen", size: "48 fl oz", price: { regular: 4.99, promo: 4.49 }, aisle: "Frozen Aisle 15", stockLevel: "HIGH" },
  { productId: "0003700074780", upc: "0003700074780", description: "Liquid Dish Soap, Original", brand: "Dawn", category: "Household", size: "19.4 fl oz", price: { regular: 3.69, promo: null }, aisle: "Aisle 10", stockLevel: "HIGH" },
  { productId: "0003077201012", upc: "0003077201012", description: "Paper Towels, 6 Double Rolls", brand: "Bounty", category: "Household", size: "6 ct", price: { regular: 10.99, promo: 9.49 }, aisle: "Aisle 11", stockLevel: "HIGH" },
];

/** Deterministic fixture search: case-insensitive substring match on description, brand, category. */
export function searchFixtureProducts(term: string, limit: number): Product[] {
  const q = term.trim().toLowerCase();
  const scored = FIXTURE_PRODUCTS.map((p) => {
    const hay = `${p.description} ${p.brand} ${p.category}`.toLowerCase();
    let score = 0;
    for (const word of q.split(/\s+/).filter(Boolean)) {
      if (p.description.toLowerCase().startsWith(word)) score += 3;
      else if (hay.includes(word)) score += 1;
    }
    return { p, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.p.productId.localeCompare(b.p.productId));
  return scored.slice(0, limit).map((s) => s.p);
}
