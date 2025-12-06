const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncError = require('../middlewares/catchAsyncError');
const sendToken = require('../utils/jwt');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

/**
 * Register User - POST /api/v1/auth/register
 * @desc Creates new user account with avatar upload
 */
exports.registerUser = catchAsyncError(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        return next(new ErrorHandler('Please provide name, email, and password', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new ErrorHandler('User already exists with this email', 400));
    }

    // Handle avatar upload
    let avatar = '';
    const BASE_URL = process.env.NODE_ENV === 'production'
        ? `${req.protocol}://${req.get('host')}`
        : process.env.BACKEND_URL;

    if (req.file) {
        avatar = `${BASE_URL}/uploads/user/${req.file.filename}`;
    } else {
        avatar = `${BASE_URL}/images/default_avatar.png`;
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        avatar
    });

    // Send token response
    sendToken(user, 201, res, 'User registered successfully');
});

/**
 * Login User - POST /api/v1/auth/login
 * @desc Authenticates user with email and password
 */
exports.loginUser = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return next(new ErrorHandler('Please enter email and password', 400));
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    // Check password
    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    // Send token response
    sendToken(user, 200, res, 'Login successful');
});

/**
 * Logout User - GET /api/v1/auth/logout
 * @desc Clears authentication cookie
 */
exports.logoutUser = catchAsyncError(async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * Get Current User Profile - GET /api/v1/auth/me
 * @desc Returns authenticated user's profile
 */
exports.getUserProfile = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * Update User Password - PUT /api/v1/auth/password/change
 * @desc Allows authenticated user to change password
 */
exports.updatePassword = catchAsyncError(async (req, res, next) => {
    const { oldPassword, password } = req.body;

    if (!oldPassword || !password) {
        return next(new ErrorHandler('Please provide old and new password', 400));
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify old password
    const isMatched = await user.comparePassword(oldPassword);
    if (!isMatched) {
        return next(new ErrorHandler('Old password is incorrect', 401));
    }

    // Update password
    user.password = password;
    await user.save();

    sendToken(user, 200, res, 'Password updated successfully');
});

/**
 * Update User Profile - PUT /api/v1/auth/profile/update
 * @desc Updates user name, email, and avatar
 */
exports.updateProfile = catchAsyncError(async (req, res, next) => {
    const { name, email } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Handle avatar update
    if (req.file) {
        const BASE_URL = process.env.NODE_ENV === 'production'
            ? `${req.protocol}://${req.get('host')}`
            : process.env.BACKEND_URL;
        updateData.avatar = `${BASE_URL}/uploads/user/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
    });
});

/**
 * Forgot Password - POST /api/v1/auth/password/forgot
 * @desc Sends password reset email
 */
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ErrorHandler('Please provide email address', 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ErrorHandler('User not found with this email', 404));
    }

    // Get reset token
    const resetToken = user.getResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const BASE_URL = process.env.NODE_ENV === 'production'
        ? `${req.protocol}://${req.get('host')}`
        : process.env.FRONTEND_URL;

    const resetUrl = `${BASE_URL}/password/reset/${resetToken}`;

    const message = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message
        });

        res.status(200).json({
            success: true,
            message: `Password reset email sent to ${user.email}`
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler('Email could not be sent', 500));
    }
});

/**
 * Reset Password - POST /api/v1/auth/password/reset/:token
 * @desc Resets password using token from email
 */
exports.resetPassword = catchAsyncError(async (req, res, next) => {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
        return next(new ErrorHandler('Please provide password and confirmation', 400));
    }

    if (password !== confirmPassword) {
        return next(new ErrorHandler('Passwords do not match', 400));
    }

    // Hash URL token to compare with DB
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
        return next(new ErrorHandler('Password reset token is invalid or expired', 400));
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save();

    sendToken(user, 200, res, 'Password reset successful');
});

// Admin Controllers
/**
 * Get All Users - GET /api/v1/admin/users
 * @desc Admin only - returns all users
 */
exports.getAllUsers = catchAsyncError(async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        count: users.length,
        users
    });
});

/**
 * Get Single User - GET /api/v1/admin/user/:id
 * @desc Admin only - returns specific user
 */
exports.getUser = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * Update User - PUT /api/v1/admin/user/:id
 * @desc Admin only - updates user details including role
 */
exports.updateUser = catchAsyncError(async (req, res, next) => {
    const { name, email, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    );

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user
    });
});

/**
 * Delete User - DELETE /api/v1/admin/user/:id
 * @desc Admin only - deletes user account
 */
exports.deleteUser = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});
