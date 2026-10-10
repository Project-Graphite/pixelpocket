const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const sameOrigin = require('./utils/sameOrigin');
const errorController = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const gameRouter = require('./routes/gameRoutes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Generous because the library loads a cover per game; logins, uploads and saves
// have their own tighter limits
const limiter = rateLimit({
    max: 2000,
    windowMs: 15 * 60 * 1000,
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again in 15 minutes.',
    },
});
app.use('/api', limiter);
app.use('/api', sameOrigin);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/games', gameRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorController);

module.exports = app;
