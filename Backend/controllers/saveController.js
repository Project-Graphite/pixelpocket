const Save = require('./../models/saveModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const storage = require('./../utils/storage');

// The user always comes from the session, never the request, so nobody can reach another
// player's save

exports.getSave = catchAsync(async (req, res) => {
    const save = await Save.findOne({ user: req.user._id, game: req.game._id }).select('+key');
    const data = save && (await storage.getBuffer(save.key));
    if (!data) return res.status(204).end();

    res.set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Save-Updated-At': save.updatedAt.toISOString(),
    });
    res.send(data);
});

exports.putSave = catchAsync(async (req, res, next) => {
    const { game } = req;
    if (!game.battery) {
        return next(new AppError('This game does not use save files.', 400));
    }

    // The save size is fixed by the game's header
    if (!Buffer.isBuffer(req.body) || req.body.length !== game.saveSize) {
        return next(
            new AppError(`A save for this game must be exactly ${game.saveSize} bytes.`, 400),
        );
    }

    const key = storage.keys.save(req.user._id, game._id);
    await storage.put(key, req.body, 'application/octet-stream');
    const save = await Save.findOneAndUpdate(
        { user: req.user._id, game: game._id },
        { key, size: req.body.length },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({
        status: 'success',
        data: { updatedAt: save.updatedAt },
    });
});

exports.deleteSave = catchAsync(async (req, res) => {
    const save = await Save.findOneAndDelete({
        user: req.user._id,
        game: req.game._id,
    }).select('+key');
    if (save) await storage.remove([save.key]);

    res.status(204).end();
});
