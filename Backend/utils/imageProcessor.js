const sharp = require('sharp');
const AppError = require('./appError');

// Covers are re-encoded from scratch, so only the pixels survive: metadata (EXIF, GPS)
// and anything hidden in the file are dropped.

sharp.cache(false);

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 25_000_000; // stops "decompression bomb" images
const MAX_SIDE = 640;

// Checked before decoding, so the decoder only sees these three formats
const isJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b) =>
    b.length > 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const isWebp = (b) =>
    b.length > 12 &&
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP';

// Returns a WebP at most 640 px on its longest side
exports.processCover = async (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new AppError('No image was uploaded.', 400);
    }
    if (buffer.length > MAX_INPUT_BYTES) {
        throw new AppError('A cover image can be at most 5 MB.', 400);
    }
    if (!isJpeg(buffer) && !isPng(buffer) && !isWebp(buffer)) {
        throw new AppError('A cover image must be a JPEG, PNG or WebP file.', 400);
    }

    try {
        const image = sharp(buffer, {
            limitInputPixels: MAX_INPUT_PIXELS,
            failOn: 'error',
            animated: false,
        });
        const meta = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
            throw new Error('unexpected format');
        }

        // Small pixel art is enlarged with hard edges instead of being blurred
        const small = Math.max(meta.width, meta.height) < 200;

        return await image
            .rotate() // apply the camera's orientation before the metadata is dropped
            .resize({
                width: MAX_SIDE,
                height: MAX_SIDE,
                fit: 'inside',
                withoutEnlargement: !small,
                kernel: small ? 'nearest' : 'lanczos3',
            })
            .webp({ quality: 85 })
            .toBuffer();
    } catch {
        throw new AppError(
            'The image could not be read. Try a different JPEG, PNG or WebP file.',
            400,
        );
    }
};
