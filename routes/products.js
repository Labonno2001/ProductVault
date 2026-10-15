
const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// All product routes require a valid JWT token.
router.use(authenticateToken);

// GET /api/products
// List products with pagination and sorting.
router.get("/", (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 6;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "Invalid page or limit."
      });
    }

    const sortOptions = {
      "name-asc": "name COLLATE NOCASE ASC, id ASC",
      "name-desc": "name COLLATE NOCASE DESC, id DESC",
      "price-asc": "price ASC, id ASC",
      "price-desc": "price DESC, id DESC",
      "newest": "created_at DESC, id DESC"
    };

    const sort = req.query.sort || "newest";
    const orderBy = sortOptions[sort];

    if (!orderBy) {
      return res.status(400).json({
        message: "Invalid sort option.",
        allowedSortOptions: Object.keys(sortOptions)
      });
    }

    const offset = (page - 1) * limit;

    const products = db.prepare(`
      SELECT id, name, description, price, image_path,
             created_at, updated_at
      FROM products
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare(
      "SELECT COUNT(*) AS count FROM products"
    ).get().count;

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    console.error("List products error:", error.message);

    return res.status(500).json({
      message: "Could not retrieve products."
    });
  }
});

// GET /api/products/:id
// Retrieve one product.
router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const product = db.prepare(`
      SELECT id, name, description, price, image_path,
             created_at, updated_at
      FROM products
      WHERE id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    return res.json({ product });
  } catch (error) {
    console.error("Get product error:", error.message);

    return res.status(500).json({
      message: "Could not retrieve the product."
    });
  }
});

// POST /api/products
// Create a product.
router.post("/", (req, res) => {
  try {
    const { name, description = "", price, image_path = "" } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 200
    ) {
      return res.status(400).json({
        message: "Product name is required and must be under 200 characters."
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number."
      });
    }

    if (typeof description !== "string" || typeof image_path !== "string") {
      return res.status(400).json({
        message: "Description and image path must be strings."
      });
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price, image_path)
      VALUES (?, ?, ?, ?)
    `).run(
      name.trim(),
      description,
      Number(price),
      image_path
    );

    const product = db.prepare(`
      SELECT id, name, description, price, image_path,
             created_at, updated_at
      FROM products
      WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      message: "Product created successfully.",
      product
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      message: "Could not create the product."
    });
  }
});

// PUT /api/products/:id
// Update a product.
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, price, image_path } = req.body;

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const existing = db.prepare(
      "SELECT id FROM products WHERE id = ?"
    ).get(id);

    if (!existing) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 200
    ) {
      return res.status(400).json({
        message: "Product name is required and must be under 200 characters."
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number."
      });
    }

    if (
      typeof description !== "string" ||
      typeof image_path !== "string"
    ) {
      return res.status(400).json({
        message: "Description and image path must be strings."
      });
    }

    db.prepare(`
      UPDATE products
      SET name = ?,
          description = ?,
          price = ?,
          image_path = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name.trim(),
      description,
      Number(price),
      image_path,
      id
    );

    const product = db.prepare(`
      SELECT id, name, description, price, image_path,
             created_at, updated_at
      FROM products
      WHERE id = ?
    `).get(id);

    return res.json({
      message: "Product updated successfully.",
      product
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      message: "Could not update the product."
    });
  }
});

// DELETE /api/products/:id
// Delete a product.
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const result = db.prepare(
      "DELETE FROM products WHERE id = ?"
    ).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    return res.json({
      message: "Product deleted successfully."
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      message: "Could not delete the product."
    });
  }
});

module.exports = router;
