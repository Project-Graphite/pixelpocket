const express = require('express');
const authController = require('./../controllers/authController');
const adminController = require('./../controllers/adminController');
const AppError = require('./../utils/appError');

const router = express.Router();

router.use(authController.protect, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return next(new AppError('You do not have permission to do this.', 403));
    }
    next();
});

router.get('/collections', adminController.getCollections);
router.get('/collections/:name', adminController.getDocuments);
router.get('/files', adminController.getFiles);

module.exports = router;
