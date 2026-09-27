import {
  detectCategory,
  extractDate,
  extractTotalAndTax,
  extractLineItems,
  extractMerchant,
} from "@/lib/receipts/tokenizer";

describe("Receipt Tokenizer Module", () => {
  describe("detectCategory", () => {
    it("detects food category from restaurant keywords", () => {
      expect(detectCategory("Trattoria Bella Italian Pasta Pizza")).toBe("food");
      expect(detectCategory("Starbucks Coffee and Bakery Cafe")).toBe("food");
    });

    it("detects groceries category from supermarket keywords", () => {
      expect(detectCategory("Trader Joe's Supermarket Provisions")).toBe("groceries");
      expect(detectCategory("Whole Foods Market Milk and Eggs")).toBe("groceries");
    });

    it("detects transportation category from ride keywords", () => {
      expect(detectCategory("Uber Trip Taxi Fare")).toBe("transportation");
      expect(detectCategory("Shell Petrol Fuel Gas Station")).toBe("transportation");
    });

    it("detects utilities category from telecom/power keywords", () => {
      expect(detectCategory("Electric Power Bill Payment")).toBe("utilities");
      expect(detectCategory("Broadband Internet Wifi Recharge")).toBe("utilities");
    });

    it("detects entertainment category from cinema keywords", () => {
      expect(detectCategory("PVR Cinema Movie Ticket IMAX")).toBe("entertainment");
    });

    it("falls back to general when keywords are ambiguous", () => {
      expect(detectCategory("Random generic miscellaneous item")).toBe("general");
    });
  });

  describe("extractDate", () => {
    it("extracts ISO date format YYYY-MM-DD", () => {
      expect(extractDate("Invoice Date: 2026-05-18")).toBe("2026-05-18");
    });

    it("extracts DD/MM/YYYY date format", () => {
      expect(extractDate("Receipt 15/08/2026 Table 4")).toBe("2026-08-15");
    });

    it("falls back to today if no date matches", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(extractDate("No date here")).toBe(today);
    });
  });

  describe("extractTotalAndTax", () => {
    it("extracts grand total and tax from receipt lines", () => {
      const lines = [
        "Trattoria Bella",
        "Pasta Carbonara 18.00",
        "Tiramisu 8.50",
        "Subtotal: 26.50",
        "GST / Tax: 2.50",
        "GRAND TOTAL: $29.00",
        "Thank you for dining!",
      ];

      const { total, tax } = extractTotalAndTax(lines);
      expect(total).toBe(29.00);
      expect(tax).toBe(2.50);
    });

    it("falls back to highest currency number when total keyword is missing", () => {
      const lines = [
        "Store Purchase",
        "Item 1 12.00",
        "Item 2 34.50",
      ];

      const { total } = extractTotalAndTax(lines);
      expect(total).toBe(34.50);
    });
  });

  describe("extractLineItems", () => {
    it("extracts items with names, quantities and prices", () => {
      const lines = [
        "Supermarket",
        "2 x Organic Milk 7.50",
        "Whole Wheat Bread 3.20",
        "TOTAL: 10.70",
      ];

      const items = extractLineItems(lines);
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items[0]).toEqual({
        name: "Organic Milk",
        quantity: 2,
        price: 7.5,
      });
      expect(items[1]).toEqual({
        name: "Whole Wheat Bread",
        quantity: 1,
        price: 3.2,
      });
    });
  });

  describe("extractMerchant", () => {
    it("extracts clean merchant name from top receipt lines", () => {
      const lines = [
        "Blue Tokai Coffee Roasters",
        "100 Feet Road, Indiranagar",
        "Tax Invoice",
      ];

      expect(extractMerchant(lines, "receipt.jpg")).toBe("Blue Tokai Coffee Roasters");
    });

    it("falls back to cleaned filename when receipt lines are empty", () => {
      expect(extractMerchant([], "starbucks_coffee_scan.png")).toBe("Starbucks coffee");
    });
  });
});
