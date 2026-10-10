const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'A game needs a title'],
            trim: true,
            maxlength: [60, 'A title can have at most 60 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'A description can have at most 500 characters'],
            default: '',
        },
        // library: public, managed by admins. private: only the uploader can see it.
        visibility: {
            type: String,
            enum: ['library', 'private'],
            required: true,
        },
        owner: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },

        // Read from the ROM header by utils/romValidator
        romKey: { type: String, required: true, select: false },
        romSize: { type: Number, required: true },
        romSha256: { type: String, required: true, select: false },
        headerTitle: { type: String, default: '' },
        cartridgeType: { type: Number, required: true },
        cartridgeName: { type: String, required: true },
        battery: { type: Boolean, default: false },
        saveSize: { type: Number, default: 0 },

        coverKey: { type: String, select: false },
        coverUpdatedAt: Date,
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(doc, ret) {
                delete ret._id;
                delete ret.__v;
                delete ret.romKey;
                delete ret.romSha256;
                delete ret.coverKey;
                return ret;
            },
        },
    },
);

gameSchema.virtual('hasCover').get(function () {
    return Boolean(this.coverUpdatedAt);
});

gameSchema.index({ visibility: 1, createdAt: -1 });
gameSchema.index({ owner: 1, visibility: 1, createdAt: -1 });

// The same ROM can't be added twice to the library, or twice by the same user
gameSchema.index(
    { romSha256: 1 },
    { unique: true, partialFilterExpression: { visibility: 'library' } },
);
gameSchema.index(
    { owner: 1, romSha256: 1 },
    { unique: true, partialFilterExpression: { visibility: 'private' } },
);

// Who may play or download a game
gameSchema.methods.canAccess = function (user) {
    if (this.visibility === 'library') return true;
    return Boolean(user) && this.owner.equals(user._id);
};

// Who may edit or delete a game. Admins can't see private games either.
gameSchema.methods.canManage = function (user) {
    if (!user) return false;
    if (this.visibility === 'library') return user.role === 'admin';
    return this.owner.equals(user._id);
};

module.exports = mongoose.model('Game', gameSchema);
