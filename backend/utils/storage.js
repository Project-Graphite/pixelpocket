const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    HeadBucketCommand,
} = require('@aws-sdk/client-s3');
const AppError = require('./appError');

// ROMs, covers and saves live in S3-compatible storage (MinIO). Keys are always built
// here, never taken from user input.
const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
});
const Bucket = process.env.S3_BUCKET || 'pixelpocket';

exports.keys = {
    rom: (gameId) => `roms/${gameId}.gb`,
    cover: (gameId) => `covers/${gameId}.webp`,
    save: (userId, gameId) => `saves/${userId}/${gameId}.sav`,
};

// Fails at startup if the bucket is missing or the credentials are wrong
exports.checkConnection = async () => {
    await client.send(new HeadBucketCommand({ Bucket }));
};

exports.put = async (key, body, contentType) => {
    await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
    );
};

// A Buffer, or null if the object doesn't exist
exports.getBuffer = async (key) => {
    try {
        const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
        if (err.name === 'NoSuchKey') return null;
        throw err;
    }
};

exports.pipeTo = async (key, res, headers) => {
    let object;
    try {
        object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
    } catch (err) {
        if (err.name === 'NoSuchKey') {
            throw new AppError('File not found.', 404);
        }
        throw err;
    }

    res.set(headers);
    if (object.ContentLength !== undefined) {
        res.set('Content-Length', String(object.ContentLength));
    }
    await new Promise((resolve, reject) => {
        object.Body.on('error', reject);
        res.on('finish', resolve);
        // A client that disconnects must not leave the storage connection open
        res.on('close', () => {
            object.Body.destroy();
            resolve();
        });
        object.Body.pipe(res);
    });
};

// One page of files; pass `next` back as `after` for the following page
exports.list = async (after) => {
    const res = await client.send(
        new ListObjectsV2Command({ Bucket, MaxKeys: 100, ContinuationToken: after }),
    );
    return {
        files: (res.Contents || []).map((o) => ({
            key: o.Key,
            size: o.Size,
            lastModified: o.LastModified,
        })),
        next: res.NextContinuationToken || null,
    };
};

exports.remove = async (keyList) => {
    const list = keyList.filter(Boolean);
    // DeleteObjects accepts at most 1000 keys per call
    for (let i = 0; i < list.length; i += 1000) {
        await client.send(
            new DeleteObjectsCommand({
                Bucket,
                Delete: {
                    Objects: list.slice(i, i + 1000).map((Key) => ({ Key })),
                    Quiet: true,
                },
            }),
        );
    }
};
