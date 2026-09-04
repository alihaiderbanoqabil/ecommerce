/**
 * seed.js
 * -----------------------------------------------------------------------
 * Generates fake data and dumps it into your local MongoDB database using
 * your existing Mongoose models (User, Category, Product, Order).
 *
 * WHERE TO PUT THIS FILE
 *   backend/src/seed/seed.js
 *   (so that the relative "../models/..." requires below resolve correctly)
 *
 * INSTALL THE ONE EXTRA DEV DEPENDENCY THIS SCRIPT NEEDS
 *   npm install --save-dev @faker-js/faker
 *
 * RUN IT
 *   node src/seed/seed.js
 *   node src/seed/seed.js --clear      -> wipes Users/Categories/Products/Orders first (default: true anyway, see CLEAR_FIRST)
 *   node src/seed/seed.js --keep       -> does NOT wipe existing data, just adds more
 *
 * OPTIONAL: add to package.json scripts
 *   "seed": "node src/seed/seed.js"
 *
 * WHAT IT CREATES
 *   - 1 admin user
 *   - 10 customer users
 *   - 5 base (parent) categories, each with 2 nested (child) categories
 *   - Products spread across every category, with the FIRST nested
 *     category guaranteed at least 50 products
 *   - ~20 fake orders spread across random customers
 *   - Comments/reviews on a slice of products (with ratings + a few replies),
 *     which also fills each product's averageRating / numReviews
 * -----------------------------------------------------------------------
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");

const User = require("../models/user.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Comment = require("../models/comment.model");
const Notification = require("../models/notification.model");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/ecommerce";

const CLEAR_FIRST = !process.argv.includes("--keep");

const NUM_CUSTOMERS = 10;
const MIN_PRODUCTS_PER_CATEGORY = 8;
const MAX_PRODUCTS_PER_CATEGORY = 20;
const BULK_CATEGORY_PRODUCT_COUNT = 55; // "minimum 50 products" requirement
const NUM_ORDERS = 20;
const NUM_COMMENTED_PRODUCTS = 30; // kitne products par comments aayen
const MAX_COMMENTS_PER_PRODUCT = 5;

const DEFAULT_PASSWORD = "Password@123"; // used for all customers
const ADMIN_PASSWORD = "Admin@123";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (str) => str.toLowerCase().trim().replace(/\s+/g, "-");

function randomAddress() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  };
}

function fakeImages(count = 3) {
  return Array.from({ length: count }, (_, i) =>
    `https://picsum.photos/seed/${faker.string.alphanumeric(8)}-${i}/640/480`
  );
}

// ---------------------------------------------------------------------------
// Category taxonomy (base -> children)
// ---------------------------------------------------------------------------
const CATEGORY_TREE = [
  {
    name: "Electronics",
    description: "Gadgets, devices and accessories",
    children: [
      { name: "Smartphones", description: "Mobile phones and accessories" },
      { name: "Laptops", description: "Laptops and notebooks" },
    ],
  },
  {
    name: "Clothing",
    description: "Apparel for men, women and kids",
    children: [
      { name: "Men's Clothing", description: "Shirts, pants, jackets for men" },
      { name: "Women's Clothing", description: "Dresses, tops, bottoms for women" },
    ],
  },
  {
    name: "Home & Kitchen",
    description: "Everything for your home",
    children: [
      { name: "Furniture", description: "Chairs, tables, sofas" },
      { name: "Cookware", description: "Pots, pans and kitchen tools" },
    ],
  },
  {
    name: "Books",
    description: "Fiction and non-fiction books",
    children: [
      { name: "Fiction", description: "Novels and short stories" },
      { name: "Non-Fiction", description: "Biographies, self-help, and more" },
    ],
  },
  {
    name: "Sports & Outdoors",
    description: "Gear for sports and outdoor activities",
    children: [
      { name: "Fitness Equipment", description: "Home gym and fitness gear" },
      { name: "Camping Gear", description: "Tents, backpacks, and outdoor equipment" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------
async function clearCollections() {
  console.log("Clearing existing Users, Categories, Products, Orders, Comments, Notifications...");
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Comment.deleteMany({}),
    // Purani notifications un users/orders ko point karti hain jo ab hain hi
    // nahi — inhe chhorna sirf confusion paida karta hai
    Notification.deleteMany({}),
  ]);
}

async function seedUsers() {
  console.log("Creating users...");

  const admin = new User({
    name: "Admin User",
    email: "admin@example.com",
    password: ADMIN_PASSWORD, // hashed by pre-save hook
    role: "admin",
    address: randomAddress(),
    phone: faker.phone.number(),
    isEmailVerified: true,
  });
  await admin.save();

  const customers = [];
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const customer = new User({
      name: `${firstName} ${lastName}`,
      email: faker.internet
        .email({ firstName, lastName })
        .toLowerCase(),
      password: DEFAULT_PASSWORD, // hashed by pre-save hook
      role: "customer",
      address: randomAddress(),
      phone: faker.phone.number(),
      isEmailVerified: faker.datatype.boolean({ probability: 0.8 }),
    });
    await customer.save();
    customers.push(customer);
  }

  console.log(`  -> 1 admin + ${customers.length} customers created`);
  return { admin, customers };
}

async function seedCategories() {
  console.log("Creating categories...");

  const baseCategories = [];
  const childCategories = [];

  for (const base of CATEGORY_TREE) {
    const baseDoc = new Category({
      name: base.name,
      description: base.description,
      slug: slugify(base.name),
      image: `https://picsum.photos/seed/${slugify(base.name)}/400/300`,
      parentCategory: null,
    });
    await baseDoc.save();
    baseCategories.push(baseDoc);

    for (const child of base.children) {
      const childDoc = new Category({
        name: child.name,
        description: child.description,
        slug: slugify(child.name),
        image: `https://picsum.photos/seed/${slugify(child.name)}/400/300`,
        parentCategory: baseDoc._id,
      });
      await childDoc.save();
      childCategories.push(childDoc);
    }
  }

  console.log(
    `  -> ${baseCategories.length} base categories + ${childCategories.length} nested categories created`
  );
  return { baseCategories, childCategories };
}

function buildFakeProduct(category) {
  const name = faker.commerce.productName();
  return {
    name,
    description: faker.commerce.productDescription(),
    price: Number(faker.commerce.price({ min: 5, max: 2000, dec: 2 })),
    category: category._id,
    stock: randInt(0, 500),
    images: fakeImages(randInt(1, 4)),
    sku: `SKU-${slugify(category.name)}-${faker.string.alphanumeric(8).toUpperCase()}`,
    isActive: faker.datatype.boolean({ probability: 0.9 }),
  };
}

async function seedProducts({ baseCategories, childCategories }) {
  console.log("Creating products...");

  const allCategories = [...baseCategories, ...childCategories];
  const bulkCategory = childCategories[0]; // guaranteed >= 50 products here

  const productDocs = [];

  for (const category of allCategories) {
    const count =
      category._id.equals(bulkCategory._id)
        ? BULK_CATEGORY_PRODUCT_COUNT
        : randInt(MIN_PRODUCTS_PER_CATEGORY, MAX_PRODUCTS_PER_CATEGORY);

    for (let i = 0; i < count; i++) {
      productDocs.push(buildFakeProduct(category));
    }
  }

  // insertMany is fine here: Product schema has no pre-save hooks to run,
  // just a text index, which insertMany respects.
  const inserted = await Product.insertMany(productDocs, { ordered: false });

  console.log(`  -> ${inserted.length} products created`);
  console.log(
    `  -> "${bulkCategory.name}" has ${BULK_CATEGORY_PRODUCT_COUNT} products (bulk category)`
  );

  return inserted;
}

async function seedOrders({ customers, products }) {
  console.log("Creating orders...");

  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  const paymentMethods = ["card", "cod", "paypal"];

  const orders = [];

  for (let i = 0; i < NUM_ORDERS; i++) {
    const user = pick(customers);
    const itemCount = randInt(1, 4);

    // pick N distinct random products
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const chosenProducts = shuffled.slice(0, itemCount);

    const items = chosenProducts.map((p) => ({
      product: p._id,
      quantity: randInt(1, 5),
      price: p.price,
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const status = pick(statuses);
    const paymentMethod = pick(paymentMethods);
    const paymentStatus =
      status === "cancelled"
        ? pick(["failed", "refunded"])
        : status === "delivered"
          ? "paid"
          : pick(["pending", "paid"]);

    const order = new Order({
      user: user._id,
      items,
      totalAmount: Number(totalAmount.toFixed(2)),
      status,
      shippingAddress: user.address?.street ? user.address : randomAddress(),
      paymentMethod,
      paymentStatus,
    });

    await order.save();
    orders.push(order);
  }

  console.log(`  -> ${orders.length} orders created`);
  return orders;
}

async function seedComments({ admin, customers, products }) {
  console.log("Creating comments...");

  // Sirf active products par comments — inactive product par API bhi comment
  // banane nahi deti, to seed data bhi wesa hi rakhte hain.
  const activeProducts = products.filter((p) => p.isActive);
  const chosenProducts = [...activeProducts]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(NUM_COMMENTED_PRODUCTS, activeProducts.length));

  let topLevelCount = 0;
  let replyCount = 0;

  for (const product of chosenProducts) {
    // Ek user ek product par ek hi rating de sakta hai — is liye har product ke
    // liye customers shuffle kar ke distinct users pick karte hain.
    const shuffledCustomers = [...customers].sort(() => 0.5 - Math.random());
    const commentCount = Math.min(randInt(1, MAX_COMMENTS_PER_PRODUCT), shuffledCustomers.length);

    for (let i = 0; i < commentCount; i++) {
      const author = shuffledCustomers[i];

      // 80% comments rated review hote hain, baqi sirf sawaal/baat
      const comment = new Comment({
        product: product._id,
        user: author._id,
        text: faker.lorem.sentences(randInt(1, 3)),
        rating: faker.datatype.boolean({ probability: 0.8 }) ? randInt(1, 5) : null,
      });
      await comment.save(); // save() ka hook product ki rating sync karta hai
      topLevelCount++;

      // Kabhi kabhi admin reply karta hai (seller response)
      if (faker.datatype.boolean({ probability: 0.3 })) {
        const reply = new Comment({
          product: product._id,
          user: admin._id,
          text: faker.lorem.sentence(),
          parentComment: comment._id, // reply par rating nahi
        });
        await reply.save();
        replyCount++;
      }
    }
  }

  console.log(
    `  -> ${topLevelCount} comments + ${replyCount} replies created on ${chosenProducts.length} products`
  );
  console.log("  -> products ke averageRating / numReviews save hooks se bhar gaye");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Connecting to MongoDB at ${MONGO_URI} ...`);
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  try {
    if (CLEAR_FIRST) {
      await clearCollections();
    }

    const { admin, customers } = await seedUsers();
    const { baseCategories, childCategories } = await seedCategories();
    const products = await seedProducts({ baseCategories, childCategories });
    await seedOrders({ customers, products });
    await seedComments({ admin, customers, products });

    console.log("\nSeeding complete!");
    console.log("--------------------------------------------------");
    console.log(`Admin login   -> email: admin@example.com | password: ${ADMIN_PASSWORD}`);
    console.log(`Customer login-> email: ${customers[0].email} | password: ${DEFAULT_PASSWORD}`);
    console.log("(All 10 customers share the same password above, emails differ.)");
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();