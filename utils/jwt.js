/**
 * sendToken - Creates JWT token and sets httpOnly cookie
 * @param {Object} user - User document from MongoDB
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {String} message - Optional success message
 */
const sendToken = (user, statusCode, res, message = 'Success') => {
    // Validate JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
    }
    
    if (!process.env.COOKIE_EXPIRES_TIME) {
        throw new Error('COOKIE_EXPIRES_TIME is missing');
    }

    // Generate JWT token
    const token = user.getJwtToken();

    // Cookie options
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict'
    };

    // Remove password from user object before sending
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
            token,
            user: userResponse
        });
};

module.exports = sendToken;