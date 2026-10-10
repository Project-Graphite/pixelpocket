const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');

const router = express.Router();

const limiter = (max, windowMs, message, options = {}) =>
    rateLimit({ max, windowMs, message: { status: 'fail', message }, ...options });

// Only failed logins count
const loginLimiter = limiter(
    10,
    15 * 60 * 1000,
    'Too many failed login attempts from this IP, please try again in 15 minutes.',
    { skipSuccessfulRequests: true },
);
const signupLimiter = limiter(
    10,
    60 * 60 * 1000,
    'Too many accounts created from this IP, please try again in an hour.',
);
const passwordResetLimiter = limiter(
    5,
    60 * 60 * 1000,
    'Too many password reset requests from this IP, please try again in an hour.',
);

router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/forgotPassword', passwordResetLimiter, authController.forgotPassword);
router.patch('/resetPassword/:token', passwordResetLimiter, authController.resetPassword);

// The logged-in user, or null for guests (200 either way)
router.get('/session', authController.identify, userController.getSession);

router.use(authController.protect);

router.patch('/updateMe', userController.updateMe);
router.patch('/updateMyPassword', authController.updatePassword);
router.delete('/deleteMe', userController.deleteMe);

module.exports = router;
