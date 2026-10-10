const AppError = require('./appError');

// Refuses requests that change data when they come from another website. Browsers always
// send Origin on these; requests without one (API tools) still need a valid login.
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

module.exports = (req, res, next) => {
    if (SAFE_METHODS.includes(req.method)) return next();

    const origin = req.get('origin');
    if (!origin) return next();

    let originHost;
    try {
        originHost = new URL(origin).host;
    } catch {
        return next(new AppError('Request blocked: invalid origin.', 403));
    }

    // Behind nginx the public host arrives in X-Forwarded-Host
    const host = req.get('x-forwarded-host') || req.get('host');
    if (originHost !== host) {
        return next(new AppError('Request blocked: it came from another website.', 403));
    }
    next();
};
