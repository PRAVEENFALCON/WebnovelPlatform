const User = require("../models/User");

// REGISTER USER

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email, and password are required",
            });
        }

        // Validate username
        if (username.trim().length < 3 || username.trim().length > 30) {
            return res.status(400).json({
                message: "Username must be between 3 and 30 characters",
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address",
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        // Check whether the user already exists
        const existingUser = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists",
            });
        }

        // Create user
        const user = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,

            // IMPORTANT:
            // Users cannot choose their own privileged role.
            role: "reader",
        });

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        // Handle duplicate email race condition
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists",
            });
        }

        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Registration failed",
        });
    }
};

// LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // Find user and explicitly include password
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        }).select("+password");

        // Generic message prevents revealing whether email exists
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // Check account status
        if (!user.isActive) {
            return res.status(403).json({
                message: "This account is unavailable",
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // Regenerate session to help prevent session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error("Session regeneration error:", err.message);

                return res.status(500).json({
                    message: "Login failed",
                });
            }

            req.session.userId = user._id.toString();

            req.session.save((saveError) => {
                if (saveError) {
                    console.error("Session save error:", saveError.message);

                    return res.status(500).json({
                        message: "Login failed",
                    });
                }

                res.status(200).json({
                    message: "Login successful",
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                });
            });
        });
    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed",
        });
    }
};

// LOGOUT USER

const logoutUser = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed",
            });
        }

        res.clearCookie("webnovel.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        res.status(200).json({
            message: "Logout successful",
        });
    });
};

// GET CURRENT USER

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Current user error:", error.message);

        res.status(500).json({
            message: "Unable to retrieve user",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
};