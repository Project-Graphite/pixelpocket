const Game = require('./../models/gameModel');
const Save = require('./../models/saveModel');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const storage = require('./../utils/storage');
const { validateRom } = require('./../utils/romValidator');
const { processCover } = require('./../utils/imageProcessor');

const MB = 1024 * 1024;

// Per user for private games; in total for the library
const LIMITS = {
    private: { games: 50, bytes: 256 * MB },
    library: { games: 1000, bytes: 4096 * MB },
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

// Strips control and invisible characters that could disguise text. Descriptions keep line breaks.
const cleanText = (value, { multiline = false } = {}) => {
    if (typeof value !== 'string') return '';
    const controls = multiline
        ? /[\u0000-\u0009\u000b-\u001f\u007f]/g
        : /[\u0000-\u001f\u007f]/g;
    return value
        .replace(controls, '')
        .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
        .trim();
};

// toJSON already drops the storage keys and file hash
const present = (game, user) => {
    const json = game.toJSON();
    delete json.owner;
    return { ...json, canManage: game.canManage(user) };
};

exports.getGames = catchAsync(async (req, res, next) => {
    const scope = req.query.scope === 'mine' ? 'mine' : 'library';
    if (scope === 'mine' && !req.user) {
        return next(new AppError('Log in to see your games.', 401));
    }

    const base =
        scope === 'mine'
            ? { visibility: 'private', owner: req.user._id }
            : { visibility: 'library' };

    const features = new APIFeatures(Game.find(base), req.query, {
        sortable: ['title', 'createdAt'],
        searchable: 'title',
        defaultSort: 'title',
        defaultLimit: 24,
        maxLimit: 48,
    })
        .search()
        .sort()
        .paginate();

    const [games, total] = await Promise.all([
        features.query,
        Game.countDocuments(features.conditions),
    ]);

    res.status(200).json({
        status: 'success',
        results: games.length,
        total,
        page: features.page,
        pages: Math.max(1, Math.ceil(total / features.limit)),
        data: { games: games.map((game) => present(game, req.user)) },
    });
});

// Loads :id into req.game. A game the caller can't open is reported missing, so private
// games can't be confirmed to exist.
exports.loadGame = catchAsync(async (req, res, next) => {
    const notFound = new AppError('No game found with that ID.', 404);
    if (!OBJECT_ID.test(req.params.id)) return next(notFound);

    const game = await Game.findById(req.params.id).select('+romKey +coverKey');
    if (!game || !game.canAccess(req.user)) return next(notFound);

    req.game = game;
    next();
});

exports.requireManage = (req, res, next) => {
    if (!req.game.canManage(req.user)) {
        return next(new AppError('You do not have permission to change this game.', 403));
    }
    next();
};

exports.getGame = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: { game: present(req.game, req.user) },
    });
};

exports.createGame = catchAsync(async (req, res, next) => {
    const romFile = req.files && req.files.rom && req.files.rom[0];
    const coverFile = req.files && req.files.cover && req.files.cover[0];

    if (!romFile) return next(new AppError('Choose a .gb file to upload.', 400));

    const check = validateRom(romFile.buffer);
    if (!check.ok) return next(new AppError(check.error, 400));
    const rom = check.info;

    // Only admins can add to the library
    const visibility =
        req.user.role === 'admin' && req.body.destination !== 'mine' ? 'library' : 'private';
    const scope =
        visibility === 'library'
            ? { visibility: 'library' }
            : { visibility: 'private', owner: req.user._id };

    const duplicate = await Game.exists({ ...scope, romSha256: rom.sha256 });
    if (duplicate) {
        return next(
            new AppError(
                visibility === 'library'
                    ? 'This game is already in the library.'
                    : 'You already uploaded this game.',
                409,
            ),
        );
    }

    const limits = LIMITS[visibility];
    const [usage = { count: 0, bytes: 0 }] = await Game.aggregate([
        { $match: scope },
        { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$romSize' } } },
    ]);
    if (usage.count >= limits.games) {
        return next(
            new AppError(`You can keep up to ${limits.games} games. Delete one to add another.`, 403),
        );
    }
    if (usage.bytes + rom.size > limits.bytes) {
        return next(
            new AppError(
                `This upload would go over your ${limits.bytes / MB} MB storage limit. Delete a game to make room.`,
                403,
            ),
        );
    }

    const cover = coverFile ? await processCover(coverFile.buffer) : null;

    const game = new Game({
        title: cleanText(req.body.title) || rom.headerTitle || 'Untitled game',
        description: cleanText(req.body.description, { multiline: true }),
        visibility,
        owner: req.user._id,
        romSize: rom.size,
        romSha256: rom.sha256,
        headerTitle: rom.headerTitle,
        cartridgeType: rom.cartridgeType,
        cartridgeName: rom.cartridgeName,
        battery: rom.battery,
        saveSize: rom.saveSize,
    });
    game.romKey = storage.keys.rom(game._id);
    if (cover) {
        game.coverKey = storage.keys.cover(game._id);
        game.coverUpdatedAt = new Date();
    }

    // Validate before any file is stored
    await game.validate();

    await storage.put(game.romKey, romFile.buffer, 'application/octet-stream');
    try {
        if (cover) await storage.put(game.coverKey, cover, 'image/webp');
        await game.save();
    } catch (err) {
        await storage.remove([game.romKey, game.coverKey]).catch(() => {});
        throw err;
    }

    res.status(201).json({
        status: 'success',
        data: { game: present(game, req.user) },
    });
});

exports.updateGame = catchAsync(async (req, res, next) => {
    const { game } = req;
    let changed = false;

    if (req.body.title !== undefined) {
        const title = cleanText(req.body.title);
        if (!title) return next(new AppError('Enter a title for the game.', 400));
        game.title = title;
        changed = true;
    }
    if (req.body.description !== undefined) {
        game.description = cleanText(req.body.description, { multiline: true });
        changed = true;
    }
    if (!changed) {
        return next(new AppError('Send a title or a description to update.', 400));
    }

    await game.save();
    res.status(200).json({
        status: 'success',
        data: { game: present(game, req.user) },
    });
});

exports.deleteGame = catchAsync(async (req, res) => {
    const { game } = req;
    const saves = await Save.find({ game: game._id }).select('+key');

    await Save.deleteMany({ game: game._id });
    await game.deleteOne();

    // A failed cleanup only leaves unreachable files behind
    storage
        .remove([game.romKey, game.coverKey, ...saves.map((s) => s.key)])
        .catch((err) => console.error('File cleanup failed:', err.message));

    res.status(204).end();
});

exports.getRom = catchAsync(async (req, res) => {
    await storage.pipeTo(req.game.romKey, res, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="game.gb"',
        'Cache-Control':
            req.game.visibility === 'library' ? 'private, max-age=3600' : 'private, no-store',
    });
});

exports.getCover = catchAsync(async (req, res, next) => {
    if (!req.game.coverKey) return next(new AppError('This game has no cover image.', 404));

    // Cover URLs carry a version (?v=...), so they can be cached forever
    await storage.pipeTo(req.game.coverKey, res, {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'inline; filename="cover.webp"',
        'Cache-Control': `${req.game.visibility === 'library' ? 'public' : 'private'}, max-age=31536000, immutable`,
    });
});

exports.setCover = catchAsync(async (req, res, next) => {
    if (!req.file) return next(new AppError('Choose an image to upload.', 400));

    const cover = await processCover(req.file.buffer);
    const { game } = req;
    game.coverKey = storage.keys.cover(game._id);
    await storage.put(game.coverKey, cover, 'image/webp');
    game.coverUpdatedAt = new Date();
    await game.save();

    res.status(200).json({
        status: 'success',
        data: { game: present(game, req.user) },
    });
});

exports.deleteCover = catchAsync(async (req, res) => {
    const { game } = req;
    if (game.coverKey) await storage.remove([game.coverKey]);
    game.coverKey = undefined;
    game.coverUpdatedAt = undefined;
    await game.save();

    res.status(200).json({
        status: 'success',
        data: { game: present(game, req.user) },
    });
});
