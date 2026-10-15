
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "products"
);

// Create the upload folder automatically if it does not exist.
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      `${Date.now()}-${require("crypto").randomUUID()}${extension}`;

    callback(null, uniqueName);
  }
});

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WebP images are allowed.")
      );
    }

    callback(null, true);
  }
});

// Upload an image for an existing product.
router.post(
  "/:id",
  authenticateToken,
  (req, res, next) => {
    upload.single("image")(req, res, error => {
      if (error) {
        return res.status(400).json({
          message: error.message || "Image upload failed."
        });
      }

      next();
    });
  },
  (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const product = db
      .prepare("SELECT id FROM products WHERE id = ?")
      .get(productId);

    if (!product) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        message: "Product not found."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image to upload."
      });
    }

    const imagePath = `/uploads/products/${req.file.filename}`;

    db.prepare(`
      UPDATE products
      SET image_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(imagePath, productId);

    res.json({
      message: "Product image uploaded successfully.",
      image_path: imagePath
    });
  }
);

module.exports = router;
