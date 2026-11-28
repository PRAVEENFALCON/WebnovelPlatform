const express = require("express");

const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

// Registration
router.post("/register", registerUser);

// Login
router.post("/login", loginLimiter, loginUser);

// Logout
router.post("/logout", protect, logoutUser);

// Get logged-in user
router.get("/me", protect, getCurrentUser);

module.exports = router;