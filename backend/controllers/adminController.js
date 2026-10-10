const mongoose = require('mongoose');
const User = require('./../models/userModel');
const Game = require('./../models/gameModel');
const storage = require('./../utils/storage');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const PAGE_SIZE = 50;
// Never sent, not even to admins
const HIDDEN_FIELDS = { password: 0, passwordResetToken: 0 };

// Whole IDs only, so a 64-character file hash doesn't count as one
const OBJECT_ID = /\b[a-f\d]{24}\b/gi;

// The names of the users and games whose IDs appear in the values, so admins see who and what
const namesFor = async (values) => {
    const ids = [...new Set(values.flatMap((value) => String(value).match(OBJECT_ID) ?? []))];
    if (!ids.length) return {};
    const [users, games] = await Promise.all([
        User.find({ _id: { $in: ids } }, 'name'),
        Game.find({ _id: { $in: ids } }, 'title'),
    ]);
    return Object.fromEntries([
        ...users.map((user) => [user.id, user.name]),
        ...games.map((game) => [game.id, game.title]),
    ]);
};

const collectionNames = async () =>
    (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray())
        .map((c) => c.name)
        .sort();

exports.getCollections = catchAsync(async (req, res) => {
    const { db } = mongoose.connection;
    const collections = await Promise.all(
        (await collectionNames()).map(async (name) => ({
            name,
            count: await db.collection(name).countDocuments(),
        })),
    );

    res.status(200).json({ status: 'success', data: { collections } });
});

exports.getDocuments = catchAsync(async (req, res, next) => {
    const { name } = req.params;
    if (!(await collectionNames()).includes(name)) {
        return next(new AppError('There is no collection with that name.', 404));
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const collection = mongoose.connection.db.collection(name);
    const [documents, total] = await Promise.all([
        collection
            .find({}, { projection: HIDDEN_FIELDS })
            .sort({ _id: 1 })
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .toArray(),
        collection.countDocuments(),
    ]);
    // A row's own _id is left out: its name is already in the row
    const names = await namesFor(documents.flatMap(({ _id, ...fields }) => Object.values(fields)));

    res.status(200).json({
        status: 'success',
        total,
        page,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        data: { documents, names },
    });
});

exports.getFiles = catchAsync(async (req, res) => {
    const after = typeof req.query.after === 'string' ? req.query.after : undefined;
    const list = await storage.list(after);
    const names = await namesFor(list.files.map((file) => file.key));
    res.status(200).json({ status: 'success', data: { ...list, names } });
});
