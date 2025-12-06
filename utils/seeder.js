const path = require("path");
const products = require("../data/products.json");
const Product = require("../models/productModel");
const dotenv = require("dotenv");
const connectDatabase = require("../config/database");

// Load env only in development; Render sets env vars directly
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../config", "config.env") });
}

if (!process.env.DB_LOCAL_URI) {
  throw new Error("DB_LOCAL_URI is missing");
}

connectDatabase();

const seedProducts = async () => {
  try {
    await Product.deleteMany();
    console.log("Products deleted!");
    await Product.insertMany(products);
    console.log("All products added!");
  } catch (error) {
    console.log(error.message);
  }
  process.exit();
};

seedProducts();
