const readline = require('readline');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const validator = require('validator');

dotenv.config({ path: './config.env' });
const User = require('../models/userModel');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
});
const lines = rl[Symbol.asyncIterator]();

let muted = false;
const writeOutput = rl._writeToOutput.bind(rl);
rl._writeToOutput = (text) => {
    if (!muted) writeOutput(text);
};

const ask = async (question, { hidden = false } = {}) => {
    process.stdout.write(question);
    muted = hidden;
    const { value } = await lines.next();
    muted = false;
    if (hidden && process.stdin.isTTY) process.stdout.write('\n');
    return (value || '').trim();
};

const fail = (message) => {
    console.error(`\n${message}`);
    process.exitCode = 1;
};

const main = async () => {
    if (!process.env.DATABASE_LOCAL) {
        return fail('DATABASE_LOCAL is not set.');
    }

    const email = (process.argv[2] || (await ask('Email: '))).toLowerCase();
    if (!validator.isEmail(email)) return fail('That is not a valid email.');

    await mongoose.connect(process.env.DATABASE_LOCAL);

    const existing = await User.findOne({ email });
    if (existing) {
        if (existing.role === 'admin') {
            return console.log(`${email} is already an admin.`);
        }
        const answer = await ask(
            `${email} already has an account (${existing.name}). Make it an admin? (yes/no) `,
        );
        if (answer.toLowerCase() !== 'yes') return console.log('Nothing changed.');

        existing.role = 'admin';
        await existing.save({ validateBeforeSave: false });
        return console.log(`${email} is now an admin.`);
    }

    const name = await ask('Name: ');
    const password = await ask('Password (8-72 characters): ', { hidden: true });
    const passwordConfirm = await ask('Confirm password: ', { hidden: true });
    if (password !== passwordConfirm) return fail('The passwords do not match.');

    await User.create({ name, email, password, passwordConfirm, role: 'admin' });
    console.log(`Admin account created for ${email}.`);
};

main()
    .catch((err) => {
        fail(err.errors ? Object.values(err.errors).map((e) => e.message).join('\n') : err.message);
    })
    .finally(async () => {
        rl.close();
        await mongoose.disconnect();
    });
