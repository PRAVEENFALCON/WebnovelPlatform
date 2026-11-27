const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        // Check whether session contains a user ID
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        // Find authenticated user
        const user = await User.findById(req.session.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        // Attach user information to request
        req.user = user;

        next();
    } catch (error) {
        console.error("Authentication middleware error:", error.message);

        res.status(500).json({
            message: "Authentication verification failed",
        });
    }
};

module.exports = protect;