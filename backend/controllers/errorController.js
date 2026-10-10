const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}.`, 400);

const handleDuplicateFieldsDB = (err) => {
    if (err.keyValue && err.keyValue.email) {
        return new AppError('That email is already registered. Log in or use another email.', 400);
    }
    if (err.keyValue && err.keyValue.romSha256) {
        return new AppError('This game has already been uploaded.', 409);
    }
    const value = err.keyValue ? JSON.stringify(err.keyValue) : 'duplicate value';
    return new AppError(`Duplicate field value: ${value}. Please use another value!`, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
};

const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: 'The file is too large. A ROM can be up to 8 MB and a cover image up to 5 MB.',
    LIMIT_FILE_COUNT: 'Too many files. Upload one ROM and at most one cover image.',
    LIMIT_UNEXPECTED_FILE: 'Unexpected file. Upload the ROM as "rom" and the image as "cover".',
};

const handleMulterError = (err) =>
    new AppError(MULTER_MESSAGES[err.code] || 'The upload could not be read.', 400);

// From the raw body parser used for save files
const handleTooLarge = () => new AppError('The file is too large.', 413);

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleTokenExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

const sendDevError = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        err,
        message: err.message,
        stack: err.stack,
    });
};

const sendProdError = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({ status: err.status, message: err.message });
    } else {
        console.error('Error 💥', err);
        res.status(500).json({ status: 'error', message: 'Something went very wrong!' });
    }
};

module.exports = (err, req, res, next) => {
    // A file was already streaming; let Express close the connection
    if (res.headersSent) return next(err);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = err;
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleTokenExpiredError();
    if (err.name === 'MulterError') error = handleMulterError(err);
    if (err.type === 'entity.too.large') error = handleTooLarge();

    if (process.env.NODE_ENV === 'production') {
        sendProdError(error, res);
    } else {
        sendDevError(error, res);
    }
};
