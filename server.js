
require("dotenv").config();

const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const productImageRoutes = require("./routes/productImages");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Log incoming requests and their final response status.
app.use((req, res, next) => {
  const requestUrl = req.originalUrl;

  console.log(`${req.method} ${requestUrl}`);

  res.on("finish", () => {
    console.log(
      `Response: ${res.statusCode} ${req.method} ${requestUrl}`
    );
  });

  next();
});

// Read JSON request bodies.
app.use(express.json());

// Serve frontend files.
app.use(express.static(path.join(__dirname, "public")));

// Authentication routes.
app.use("/api/auth", authRoutes);

// Product API: disable caching so product pages are fetched freshly.
app.use(
  "/api/products",
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    next();
  },
  productRoutes
);

// Product image upload route.
app.use("/api/product-images", productImageRoutes);

// Allow uploaded images to be viewed in the browser.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Test protected authentication.
app.get("/api/protected", authenticateToken, (req, res) => {
  res.set("Cache-Control", "no-store");

  res.json({
    message: "Access granted. Your token is valid.",
    user: req.user
  });
});

// Open the home page.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle unexpected errors.
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An internal server error occurred."
  });
});

// Start the server.
app.listen(PORT, () => {
  console.log(`ProductVault running at http://localhost:${PORT}`);
});
