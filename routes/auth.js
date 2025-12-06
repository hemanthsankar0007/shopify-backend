const express = require('express');
const multer = require('multer');
const path = require('path');

// Configure multer for avatar uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '..', 'uploads/user'));
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const extension = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${extension}`);
        }
    }),
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

const {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    updatePassword,
    updateProfile,
    forgotPassword,
    resetPassword,
    getAllUsers,
    getUser,
    updateUser,
    deleteUser
} = require('../controllers/authController');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/authenticate');

const router = express.Router();

// Public routes
router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.post('/password/forgot', forgotPassword);
router.post('/password/reset/:token', resetPassword);

// Protected routes (require authentication)
router.get('/me', isAuthenticatedUser, getUserProfile);
router.put('/password/change', isAuthenticatedUser, updatePassword);
router.put('/profile/update', isAuthenticatedUser, upload.single('avatar'), updateProfile);

// Admin routes (require authentication + admin role)
router.get('/admin/users', isAuthenticatedUser, authorizeRoles('admin'), getAllUsers);
router.route('/admin/user/:id')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getUser)
    .put(isAuthenticatedUser, authorizeRoles('admin'), updateUser)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), deleteUser);

module.exports = router;