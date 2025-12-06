const jwt = require('jsonwebtoken');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncError = require('./catchAsyncError');
const User = require('../models/userModel');

/**
 * isAuthenticatedUser - Middleware to verify JWT from cookie
 * @desc Protects routes by verifying token and attaching user to request
 */
exports.isAuthenticatedUser = catchAsyncError(async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return next(new ErrorHandler('Please login to access this resource', 401));
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by ID from token payload
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new ErrorHandler('Invalid or expired token', 401));
    }
});

/**
 * authorizeRoles - Middleware to check user role
 * @param {...string} roles - Allowed roles for the route
 * @desc Restricts access to specific user roles (e.g., 'admin')
 */
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorHandler(
                    `Role (${req.user.role}) is not allowed to access this resource`,
                    403
                )
            );
        }
        next();
    };
};