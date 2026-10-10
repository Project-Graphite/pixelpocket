const mongoose = require('mongoose');

// One battery save per user per game; the bytes live in object storage
const saveSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        game: {
            type: mongoose.Schema.ObjectId,
            ref: 'Game',
            required: true,
        },
        key: { type: String, required: true, select: false },
        size: { type: Number, required: true },
    },
    { timestamps: true },
);

saveSchema.index({ user: 1, game: 1 }, { unique: true });
saveSchema.index({ game: 1 });

module.exports = mongoose.model('Save', saveSchema);
