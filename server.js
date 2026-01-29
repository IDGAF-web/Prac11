require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const client = new MongoClient(process.env.MONGO_URI);

let products;

/* ===== START SERVER ONLY AFTER DB CONNECT ===== */
async function startServer() {
  try {
    await client.connect();
    const db = client.db("shop");
    products = db.collection("products");

    console.log("✅ Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`� http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

startServer();

/* ========= ADD PRODUCT ========= */
app.post("/api/products", async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    if (!name || !category || price == null) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const newProduct = {
      name,
      category,
      price: Number(price),
      stock: Number(stock) || 0
    };

    await products.insertOne(newProduct);
    res.status(201).json(newProduct);

  } catch (err) {
    res.status(500).json({ error: "Insert failed" });
  }
});

/* ========= GET PRODUCTS ========= */
app.get("/api/products", async (req, res) => {
  try {
    const { category, minPrice, sort, fields } = req.query;

    const query = {};

    if (category) {
      query.category = {
        $regex: `^${category.trim()}$`,
        $options: "i"
      };
    }

    if (minPrice) {
      query.price = { $gte: Number(minPrice) };
    }

    let projection = null;
    if (fields) {
      projection = {};
      fields.split(",").forEach(f => projection[f] = 1);
      projection._id = 0;
    }

    let cursor = products.find(query);

    if (projection) cursor = cursor.project(projection);
    if (sort === "price") cursor = cursor.sort({ price: 1 });

    const result = await cursor.toArray();
    res.json(result);

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});
