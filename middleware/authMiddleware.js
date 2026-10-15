
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Require a Bearer token in the Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Authentication token is required."
    });
  }

  const token = authHeader.slice(7);

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from .env");

    return res.status(500).json({
      message: "Server authentication is not configured."
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({
        message: "Invalid or expired token."
      });
    }

    // Attach the verified user's ID to the request
    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    next();
  });
}

module.exports = authenticateToken;
