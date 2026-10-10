const crypto = require('crypto');

// Checks by content (never the file name or Content-Type) that a file is a ROM the emulator runs

const HEADER_END = 0x150;
const MAX_ROM_SIZE = 8 * 1024 * 1024;

// Bytes 0x104-0x133 of every licensed cartridge; the boot ROM refuses to start without them
const NINTENDO_LOGO = Buffer.from(
    'CEED6666CC0D000B03730083000C000D0008111F8889000EDCCC6EE6DDDDD999BBBB67636E0EECCCDDDC999FBBB9333E',
    'hex',
);

// Cartridge types the emulator supports
const CARTRIDGE_TYPES = {
    0x00: { name: 'ROM only', battery: false },
    0x01: { name: 'MBC1', battery: false },
    0x02: { name: 'MBC1 + RAM', battery: false },
    0x03: { name: 'MBC1 + RAM + battery', battery: true },
    0x08: { name: 'ROM + RAM', battery: false },
    0x09: { name: 'ROM + RAM + battery', battery: true },
    0x0f: { name: 'MBC3 + clock + battery', battery: true, clock: true },
    0x10: { name: 'MBC3 + clock + RAM + battery', battery: true, clock: true },
    0x11: { name: 'MBC3', battery: false },
    0x12: { name: 'MBC3 + RAM', battery: false },
    0x13: { name: 'MBC3 + RAM + battery', battery: true },
    0x19: { name: 'MBC5', battery: false },
    0x1a: { name: 'MBC5 + RAM', battery: false },
    0x1b: { name: 'MBC5 + RAM + battery', battery: true },
    0x1c: { name: 'MBC5 + rumble', battery: false },
    0x1d: { name: 'MBC5 + rumble + RAM', battery: false },
    0x1e: { name: 'MBC5 + rumble + RAM + battery', battery: true },
};

// Header code at 0x149 -> external RAM size in bytes
const RAM_SIZES = { 0: 0, 1: 2048, 2: 8192, 3: 32768, 4: 131072, 5: 65536 };

// MBC3 clock saves end with the clock registers (5 bytes) and a timestamp (8 bytes)
const CLOCK_FOOTER_SIZE = 13;

const fail = (error) => ({ ok: false, error });

const headerTitle = (rom) => {
    let title = '';
    for (let i = 0x134; i <= 0x143; i += 1) {
        const c = rom[i];
        if (c === 0) break;
        if (c >= 0x20 && c <= 0x7e) title += String.fromCharCode(c);
    }
    return title.trim();
};

exports.MAX_ROM_SIZE = MAX_ROM_SIZE;

exports.validateRom = (rom) => {
    if (!Buffer.isBuffer(rom)) return fail('No ROM file was uploaded.');
    if (rom.length < HEADER_END) {
        return fail('This file is too small to be a Game Boy ROM.');
    }
    if (rom.length > MAX_ROM_SIZE) {
        return fail('A Game Boy ROM can be at most 8 MB.');
    }

    if (!rom.subarray(0x104, 0x134).equals(NINTENDO_LOGO)) {
        return fail('This file is not a Game Boy ROM.');
    }

    let checksum = 0;
    for (let i = 0x134; i <= 0x14c; i += 1) {
        checksum = (checksum - rom[i] - 1) & 0xff;
    }
    if (checksum !== rom[0x14d]) {
        return fail('The ROM header is damaged (its checksum does not match).');
    }

    if (rom[0x143] === 0xc0) {
        return fail(
            'This game only runs on the Game Boy Color, which PixelPocket does not support yet.',
        );
    }

    const typeCode = rom[0x147];
    const type = CARTRIDGE_TYPES[typeCode];
    if (!type) {
        return fail(
            `This cartridge type (0x${typeCode.toString(16).padStart(2, '0')}) is not supported yet.`,
        );
    }

    // Homebrew ROMs are often shorter than their declared size, but never larger
    const sizeCode = rom[0x148];
    if (sizeCode > 8 || rom.length > (32 * 1024) << sizeCode) {
        return fail('The ROM is larger than its header says. The file may be damaged.');
    }

    const ramCode = rom[0x149];
    if (!(ramCode in RAM_SIZES)) {
        return fail('The ROM header lists an unknown save memory size.');
    }

    const saveSize = type.battery
        ? RAM_SIZES[ramCode] + (type.clock ? CLOCK_FOOTER_SIZE : 0)
        : 0;

    return {
        ok: true,
        info: {
            headerTitle: headerTitle(rom),
            size: rom.length,
            sha256: crypto.createHash('sha256').update(rom).digest('hex'),
            cartridgeType: typeCode,
            cartridgeName: type.name,
            battery: saveSize > 0,
            saveSize,
        },
    };
};
