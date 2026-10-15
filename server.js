
require("dotenv").config();

const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const productImageRoutes = require("./routes/productImages");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

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

app.use(express.json());

// Always serve the homepage directly without browser caching.
app.get("/", (req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  res.sendFile(path.join(publicDirectory, "index.html"), (error) => {
    if (error) {
      next(error);
    }
  });
});

// Prevent stale cached copies of frontend files.
app.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  next();
});

// Serve CSS, JavaScript, and other public files.
app.use(express.static(publicDirectory));

// Authentication routes.
app.use("/api/auth", authRoutes);

// Product API.
app.use(
  "/api/products",
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  productRoutes
);

// Product image upload route.
app.use("/api/product-images", productImageRoutes);

// Serve uploaded images.
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
