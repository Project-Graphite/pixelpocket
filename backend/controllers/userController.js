const User = require('./../models/userModel');
const Game = require('./../models/gameModel');
const Save = require('./../models/saveModel');
const storage = require('./../utils/storage');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getSession = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: { user: req.user || null },
    });
};

exports.updateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword.',
                400,
            ),
        );
    }

    if (typeof req.body.name !== 'string') {
        return next(new AppError('Please provide a name.', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { name: req.body.name },
        { new: true, runValidators: true },
    );

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

// Erases the account, the user's uploaded games and all their saves. Library games stay.
exports.deleteMe = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const account = await User.findById(userId).select('+password');
    if (
        typeof req.body.password !== 'string' ||
        !(await account.correctPassword(req.body.password, account.password))
    ) {
        return next(new AppError('Your password is wrong.', 401));
    }

    const games = await Game.find({ owner: userId, visibility: 'private' }).select(
        '+romKey +coverKey',
    );
    const gameIds = games.map((g) => g._id);
    const saves = await Save.find({
        $or: [{ user: userId }, { game: { $in: gameIds } }],
    }).select('+key');

    await Save.deleteMany({ _id: { $in: saves.map((s) => s._id) } });
    await Game.deleteMany({ _id: { $in: gameIds } });
    await User.findByIdAndDelete(userId);

    storage
        .remove([...games.flatMap((g) => [g.romKey, g.coverKey]), ...saves.map((s) => s.key)])
        .catch((err) => console.error('File cleanup failed:', err.message));

    res.clearCookie('jwt');
    res.status(204).end();
});
