#pragma once
#include "gb/types.hpp"
#include "gb/cpu.hpp"
#include "gb/ppu.hpp"
#include "gb/timer.hpp"
#include "gb/bus.hpp"
#include <string>
#include <vector>

namespace gb
{
    // The whole machine: CPU, bus, PPU, timer, APU and cartridge, stepped one instruction at a time.
    class GameBoy
    {
    public:
        PPU ppu;
        Timer timer;
        Bus bus;
        CPU cpu;

        GameBoy() : bus(ppu, timer), cpu(bus) { ppu.oam_source = &bus.oam; }
        GameBoy(const GameBoy &) = delete;
        GameBoy &operator=(const GameBoy &) = delete;

        bool load_rom(const std::string &filename);
        bool load_rom_data(std::vector<u8> data);

        // Runs instructions until one full frame (70224 cycles) has been emulated.
        void run_frame();

        // Sets the registers and I/O to the state the boot ROM leaves behind.
        void reset();

        // Runs one CPU instruction and advances everything else by the same number of cycles. Returns those cycles.
        int step();

    private:
        int frame_cycles = CYCLES_PER_FRAME; // cycles run in the current frame, including overshoot
    };
}
