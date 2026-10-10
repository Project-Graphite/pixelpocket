const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const authController = require('./../controllers/authController');
const gameController = require('./../controllers/gameController');
const saveController = require('./../controllers/saveController');
const AppError = require('./../utils/appError');
const { MAX_ROM_SIZE } = require('./../utils/romValidator');

const router = express.Router();

// Files stay in memory while they are checked; tight limits stop bad requests early
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_ROM_SIZE,
        files: 2,
        fields: 5,
        fieldSize: 2 * 1024,
        parts: 8,
        headerPairs: 50,
    },
});

// Counted per account
const perUser = (max, windowMs, message) =>
    rateLimit({
        max,
        windowMs,
        keyGenerator: (req) => req.user.id,
        message: { status: 'fail', message },
    });
const uploadLimiter = perUser(30, 60 * 60 * 1000, 'Too many uploads. Try again in an hour.');
const saveLimiter = perUser(
    300,
    60 * 60 * 1000,
    'Too many save uploads. Your progress is still on this device; try again later.',
);

const requireUser = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }
    next();
};

const { loadGame, requireManage } = gameController;

// Guests can browse and play the library
router.use(authController.identify);

router
    .route('/')
    .get(gameController.getGames)
    .post(
        requireUser,
        uploadLimiter,
        upload.fields([
            { name: 'rom', maxCount: 1 },
            { name: 'cover', maxCount: 1 },
        ]),
        gameController.createGame,
    );

router
    .route('/:id')
    .get(loadGame, gameController.getGame)
    .patch(requireUser, loadGame, requireManage, gameController.updateGame)
    .delete(requireUser, loadGame, requireManage, gameController.deleteGame);

router.get('/:id/rom', loadGame, gameController.getRom);

router
    .route('/:id/cover')
    .get(loadGame, gameController.getCover)
    .put(
        requireUser,
        uploadLimiter,
        loadGame,
        requireManage,
        upload.single('cover'),
        gameController.setCover,
    )
    .delete(requireUser, loadGame, requireManage, gameController.deleteCover);

router
    .route('/:id/save')
    .get(requireUser, loadGame, saveController.getSave)
    .put(
        requireUser,
        saveLimiter,
        loadGame,
        express.raw({ type: 'application/octet-stream', limit: '256kb' }),
        saveController.putSave,
    )
    .delete(requireUser, loadGame, saveController.deleteSave);

module.exports = router;
