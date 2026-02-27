/**
 * Mock API responses for E2E video-demo tests.
 * These match the backend contract: POST /generate-data returns { json: [...] } or { csv: "..." }.
 */

export const MOCK_JSON_RESPONSE = {
  json: [
    { name: "Alice Johnson", email: "alice@example.com", age: 29, country: "USA" },
    { name: "Bob Smith", email: "bob@example.com", age: 34, country: "Canada" },
    { name: "Clara Wang", email: "clara@example.com", age: 27, country: "China" },
    { name: "David Kim", email: "david@example.com", age: 41, country: "South Korea" },
    { name: "Elena Rossi", email: "elena@example.com", age: 36, country: "Italy" },
    { name: "Frank Müller", email: "frank@example.com", age: 52, country: "Germany" },
    { name: "Grace Okafor", email: "grace@example.com", age: 23, country: "Nigeria" },
    { name: "Hiroshi Tanaka", email: "hiroshi@example.com", age: 45, country: "Japan" },
    { name: "Ines García", email: "ines@example.com", age: 31, country: "Spain" },
    { name: "James Brown", email: "james@example.com", age: 38, country: "UK" },
  ],
};

export const MOCK_JSON_RESPONSE_REGENERATED = {
  json: [
    { name: "Zara Patel", email: "zara@example.com", age: 26, country: "India" },
    { name: "Yuki Sato", email: "yuki@example.com", age: 33, country: "Japan" },
    { name: "Xander Lee", email: "xander@example.com", age: 28, country: "Singapore" },
    { name: "Wendy Chen", email: "wendy@example.com", age: 39, country: "Taiwan" },
    { name: "Victor Hugo", email: "victor@example.com", age: 44, country: "France" },
    { name: "Uma Nair", email: "uma@example.com", age: 30, country: "India" },
    { name: "Tomás Silva", email: "tomas@example.com", age: 37, country: "Brazil" },
    { name: "Suki Park", email: "suki@example.com", age: 25, country: "South Korea" },
    { name: "Raj Kapoor", email: "raj@example.com", age: 42, country: "India" },
    { name: "Pablo Ruiz", email: "pablo@example.com", age: 35, country: "Mexico" },
  ],
};

export const MOCK_CSV_RESPONSE = {
  csv: `name,email,age,country
Alice Johnson,alice@example.com,29,USA
Bob Smith,bob@example.com,34,Canada
Clara Wang,clara@example.com,27,China
David Kim,david@example.com,41,South Korea
Elena Rossi,elena@example.com,36,Italy
Frank Müller,frank@example.com,52,Germany
Grace Okafor,grace@example.com,23,Nigeria
Hiroshi Tanaka,hiroshi@example.com,45,Japan
Ines García,ines@example.com,31,Spain
James Brown,james@example.com,38,UK`,
};

export const MOCK_CUSTOM_PROMPT_RESPONSE = {
  json: [
    { product: "Widget A", quantity: 120, revenue: 2400.0, date: "2024-01-15" },
    { product: "Widget B", quantity: 85, revenue: 1700.0, date: "2024-02-10" },
    { product: "Gadget X", quantity: 200, revenue: 6000.0, date: "2024-03-05" },
    { product: "Gadget Y", quantity: 55, revenue: 2750.0, date: "2024-04-20" },
    { product: "Doohickey", quantity: 300, revenue: 3000.0, date: "2024-05-11" },
  ],
};
