#include "gb/gameboy.hpp"
#include <emscripten/emscripten.h>
#include <cstdint>
#include <memory>
#include <vector>

using namespace gb;

namespace
{
    std::unique_ptr<GameBoy> machine;
    std::vector<int16_t> audio;
    std::vector<u8> battery;
}

extern "C"
{
    EMSCRIPTEN_KEEPALIVE int gb_load_rom(const u8 *data, int size)
    {
        if (!data || size <= 0)
        {
            return 0;
        }
        auto next = std::make_unique<GameBoy>();
        if (!next->load_rom_data(std::vector<u8>(data, data + size)))
        {
            return 0;
        }
        next->reset();
        machine = std::move(next);
        audio.clear();
        battery.clear();
        return 1;
    }

    EMSCRIPTEN_KEEPALIVE void gb_unload()
    {
        machine.reset();
        audio.clear();
        battery.clear();
    }

    EMSCRIPTEN_KEEPALIVE void gb_run_frame()
    {
        if (!machine)
        {
            return;
        }
        machine->run_frame();
        audio = machine->bus.apu.take_samples();
    }

    EMSCRIPTEN_KEEPALIVE const u8 *gb_framebuffer()
    {
        return machine ? machine->ppu.framebuffer.data() : nullptr;
    }

    EMSCRIPTEN_KEEPALIVE const int16_t *gb_audio_samples()
    {
        return audio.data();
    }

    EMSCRIPTEN_KEEPALIVE int gb_audio_sample_count()
    {
        return static_cast<int>(audio.size());
    }

    EMSCRIPTEN_KEEPALIVE int gb_audio_sample_rate()
    {
        return APU::SAMPLE_RATE;
    }

    EMSCRIPTEN_KEEPALIVE void gb_set_button(int button, int pressed)
    {
        if (!machine || button < 0 || button > 7)
        {
            return;
        }
        machine->bus.joypad.set_button(static_cast<Joypad::Button>(button), pressed != 0);
    }

    EMSCRIPTEN_KEEPALIVE int gb_has_battery()
    {
        return machine && machine->bus.has_battery() ? 1 : 0;
    }

    EMSCRIPTEN_KEEPALIVE int gb_save_export()
    {
        battery = machine ? machine->bus.battery_data() : std::vector<u8>{};
        return static_cast<int>(battery.size());
    }

    EMSCRIPTEN_KEEPALIVE const u8 *gb_save_data()
    {
        return battery.data();
    }

    EMSCRIPTEN_KEEPALIVE int gb_save_import(const u8 *data, int size)
    {
        if (!machine || !data || size <= 0)
        {
            return 0;
        }
        return machine->bus.load_battery_data(std::vector<u8>(data, data + size)) ? 1 : 0;
    }
}
