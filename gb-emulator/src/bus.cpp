#include "gb/bus.hpp"
#include "gb/types.hpp"
#include "gb/ppu.hpp"
#include "gb/timer.hpp"
#include "gb/mbc/rom_only.hpp"
#include "gb/mbc/mbc1.hpp"
#include "gb/mbc/mbc3.hpp"
#include "gb/mbc/mbc5.hpp"
#include <cstdio>
#include <ctime>
#include <fstream>
#include <iterator>
#include <memory>

namespace gb
{
    namespace
    {
        std::size_t ram_size_from_header(u8 code)
        {
            switch (code)
            {
            case 0x01:
                return 2048;
            case 0x02:
                return 8192;
            case 0x03:
                return 32768;
            case 0x04:
                return 131072;
            case 0x05:
                return 65536;
            default:
                return 0;
            }
        }

        template <typename T>
        std::unique_ptr<T> make(const std::vector<u8> &rom, std::size_t ram, bool battery)
        {
            auto mbc = std::make_unique<T>(rom, ram);
            mbc->battery = battery;
            return mbc;
        }

        std::unique_ptr<MBC> make_mbc(const std::vector<u8> &rom)
        {
            if (rom.size() <= 0x149)
            {
                return std::make_unique<RomOnly>(rom, 0);
            }

            u8 type = rom[0x147];
            std::size_t ram = ram_size_from_header(rom[0x149]);

            switch (type)
            {
            case 0x00:
            case 0x08:
            case 0x09:
                return make<RomOnly>(rom, ram, type == 0x09);
            case 0x01:
            case 0x02:
            case 0x03:
                return make<MBC1>(rom, ram, type == 0x03);
            case 0x0F:
            case 0x10:
            case 0x11:
            case 0x12:
            case 0x13:
            {
                auto mbc3 = make<MBC3>(rom, ram, type != 0x11 && type != 0x12);
                mbc3->has_rtc = type <= 0x10;
                return mbc3;
            }
            case 0x19:
            case 0x1A:
            case 0x1B:
            case 0x1C:
            case 0x1D:
            case 0x1E:
            {
                auto mbc5 = make<MBC5>(rom, ram, type == 0x1B || type == 0x1E);
                mbc5->rumble = type >= 0x1C;
                return mbc5;
            }
            default:
                fprintf(stderr, "Unsupported cartridge type 0x%02X; running as ROM only\n", type);
                return std::make_unique<RomOnly>(rom, ram);
            }
        }

        bool read_file(const std::string &path, std::vector<u8> &data)
        {
            std::ifstream file(path, std::ios::binary);
            if (!file)
            {
                return false;
            }
            data.assign(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>());
            return !file.bad();
        }
    }

    Bus::Bus(PPU &ppu, Timer &timer) : ppu(ppu), timer(timer)
    {
        vram.resize(0x2000);
        wram.resize(0x2000);
        oam.resize(0xA0);
        io_regs.resize(0x80);
        hram.resize(0x7F);
    }

    u8 Bus::read(u16 addr) const
    {
        if (addr <= 0x7FFF) // ROM
        {
            if (mbc)
            {
                return mbc->read(addr);
            }
            return (addr < rom.size()) ? rom[addr] : 0xFF;
        }
        if (addr <= 0x9FFF) // VRAM
        {
            return vram[addr - 0x8000];
        }
        if (addr <= 0xBFFF) // external cartridge RAM
        {
            return mbc ? mbc->read(addr) : 0xFF;
        }
        if (addr <= 0xDFFF) // WRAM
        {
            return wram[addr - 0xC000];
        }
        if (addr <= 0xFDFF) // echo RAM, mirrors 0xC000-0xDDFF
        {
            return wram[addr - 0xE000];
        }
        if (addr <= 0xFE9F) // OAM
        {
            return oam[addr - 0xFE00];
        }
        if (addr <= 0xFEFF) // unusable
        {
            return 0xFF;
        }
        if (addr >= 0xFF10 && addr <= 0xFF3F) // sound registers and wave RAM
        {
            return apu.read(addr);
        }
        if (addr >= 0xFF80 && addr <= 0xFFFE) // HRAM
        {
            return hram[addr - 0xFF80];
        }

        switch (addr)
        {
        case 0xFF00:
            return joypad.read();
        case 0xFF01: // SB
        case 0xFF02: // SC
        case 0xFF46: // DMA
            return io_regs[addr - 0xFF00];
        case 0xFF04: // DIV is the top byte of the internal counter
            return static_cast<u8>(timer.div >> 8);
        case 0xFF05:
            return static_cast<u8>(timer.tima);
        case 0xFF06:
            return static_cast<u8>(timer.tma);
        case 0xFF07: // TAC: unused bits read as 1
            return static_cast<u8>(timer.tac | 0xF8);
        case 0xFF0F:
            return iflag | 0xE0;
        case 0xFF40:
            return ppu.lcdc;
        case 0xFF41:
            return ppu.stat_read();
        case 0xFF42:
            return ppu.scy;
        case 0xFF43:
            return ppu.scx;
        case 0xFF44:
            return ppu.ly;
        case 0xFF45:
            return ppu.lyc;
        case 0xFF47:
            return ppu.bgp;
        case 0xFF48:
            return ppu.sp0;
        case 0xFF49:
            return ppu.sp1;
        case 0xFF4A:
            return ppu.wy;
        case 0xFF4B:
            return ppu.wx;
        case 0xFFFF:
            return ie;
        default: // unmapped I/O reads 0xFF, as on a DMG
            return 0xFF;
        }
    }

    void Bus::write(u16 addr, u8 value)
    {
        if (addr <= 0x7FFF) // ROM range: writes go to the bank controller
        {
            if (mbc)
            {
                mbc->write(addr, value);
            }
            return;
        }
        if (addr <= 0x9FFF) // VRAM
        {
            vram[addr - 0x8000] = value;
            return;
        }
        if (addr <= 0xBFFF) // external cartridge RAM
        {
            if (mbc)
            {
                mbc->write(addr, value);
            }
            return;
        }
        if (addr <= 0xDFFF) // WRAM
        {
            wram[addr - 0xC000] = value;
            return;
        }
        if (addr <= 0xFDFF) // echo RAM, mirrors 0xC000-0xDDFF
        {
            wram[addr - 0xE000] = value;
            return;
        }
        if (addr <= 0xFE9F) // OAM
        {
            oam[addr - 0xFE00] = value;
            return;
        }
        if (addr <= 0xFEFF) // unusable
        {
            return;
        }
        if (addr >= 0xFF10 && addr <= 0xFF3F) // sound registers and wave RAM
        {
            apu.write(addr, value);
            return;
        }
        if (addr >= 0xFF80 && addr <= 0xFFFE) // HRAM
        {
            hram[addr - 0xFF80] = value;
            return;
        }

        switch (addr)
        {
        case 0xFF00:
            joypad.write(value);
            break;
        case 0xFF01: // SB
            io_regs[addr - 0xFF00] = value;
            break;
        case 0xFF02: // SC: with no link cable, a transfer finishes at once and SB is captured
            io_regs[addr - 0xFF00] = value;
            if (value & 0x80)
            {
                serial_output.push_back(io_regs[0x01]);
                io_regs[addr - 0xFF00] &= 0x7F;
            }
            break;
        case 0xFF04: // DIV: any write resets it
            timer.div = 0;
            break;
        case 0xFF05:
            timer.tima = value;
            break;
        case 0xFF06:
            timer.tma = value;
            break;
        case 0xFF07:
            timer.tac = value;
            break;
        case 0xFF0F:
            iflag = value;
            break;
        case 0xFF40:
            ppu.lcdc = value;
            break;
        case 0xFF41:
            ppu.stat = value & 0x78;
            break;
        case 0xFF42:
            ppu.scy = value;
            break;
        case 0xFF43:
            ppu.scx = value;
            break;
        case 0xFF45:
            ppu.lyc = value;
            break;
        case 0xFF46: // DMA: copies 160 bytes into OAM
        {
            io_regs[addr - 0xFF00] = value;
            u16 source = static_cast<u16>(value << 8);
            for (int i = 0; i < 0xA0; i++)
            {
                oam[i] = read(static_cast<u16>(source + i));
            }
            break;
        }
        case 0xFF47:
            ppu.bgp = value;
            break;
        case 0xFF48:
            ppu.sp0 = value;
            break;
        case 0xFF49:
            ppu.sp1 = value;
            break;
        case 0xFF4A:
            ppu.wy = value;
            break;
        case 0xFF4B:
            ppu.wx = value;
            break;
        case 0xFFFF:
            ie = value;
            break;
        default: // LY and unmapped I/O ignore writes
            break;
        }
    }

    bool Bus::load_rom(const std::string &filename)
    {
        std::vector<u8> data;
        return read_file(filename, data) && load_rom_data(std::move(data));
    }

    bool Bus::load_rom_data(std::vector<u8> data)
    {
        if (data.empty())
        {
            return false;
        }
        rom = std::move(data);
        mbc = make_mbc(rom);
        return true;
    }

    void Bus::tick(int cycles)
    {
        if (mbc)
        {
            mbc->tick(cycles);
        }
        apu.tick(cycles);
    }

    bool Bus::has_battery() const
    {
        return mbc && mbc->battery;
    }

    std::vector<u8> Bus::battery_data() const
    {
        if (!has_battery())
        {
            return {};
        }
        return mbc->save_data(static_cast<u64>(std::time(nullptr)));
    }

    bool Bus::load_battery_data(const std::vector<u8> &data)
    {
        if (!has_battery())
        {
            return false;
        }
        mbc->load_data(data, static_cast<u64>(std::time(nullptr)));
        return true;
    }

    bool Bus::load_save(const std::string &path)
    {
        std::vector<u8> data;
        return has_battery() && read_file(path, data) && load_battery_data(data);
    }

    bool Bus::save_ram(const std::string &path) const
    {
        std::vector<u8> data = battery_data();
        if (data.empty())
        {
            return true;
        }

        std::ofstream file(path, std::ios::binary);
        file.write(reinterpret_cast<const char *>(data.data()), static_cast<std::streamsize>(data.size()));
        return static_cast<bool>(file);
    }
}
