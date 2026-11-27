require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Ensure required environment variables exist
if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from environment variables");
}

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from environment variables");
}

// Trust proxy only in production.
// Adjust this setting based on your actual deployment proxy.
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Security headers
app.use(helmet());

// CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);

// Request body limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many requests. Please try again later.",
    },
});

app.use("/api", generalLimiter);

// Session middleware
app.use(
    session({
        name: "webnovel.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: "sessions",
            ttl: 60 * 60,
        }),

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
        },
    })
);

// Root endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Webnovel Publishing & Reading Platform API",
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "API is running",
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "Endpoint not found",
    });
});

// Start application after database connection
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start application:", error.message);
        process.exit(1);
    }
};

startServer();