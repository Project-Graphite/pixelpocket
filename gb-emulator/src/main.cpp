#include "gb/gameboy.hpp"
#include <cstdio>
#include <filesystem>
#include <iostream>
#ifdef GB_HAS_SDL
#include "gb/sdl_frontend.hpp"
#endif
using namespace gb;
using namespace std;

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        cerr << "Usage: " << argv[0] << " <rom.gb>\n";
        return 1;
    }

    GameBoy gb;
    if (!gb.load_rom(argv[1]))
    {
        cerr << "Failed to load ROM: " << argv[1] << "\n";
        return 1;
    }
    string save_path = filesystem::path(argv[1]).replace_extension(".sav").string();
    gb.bus.load_save(save_path);

    gb.reset();

#ifdef GB_HAS_SDL
    SdlFrontend frontend;
    if (!frontend.ok())
    {
        return 1;
    }

    bool running = true;
    while (running)
    {
        gb.run_frame();
        frontend.present(gb.ppu.framebuffer);
        frontend.queue_audio(gb.bus.apu.take_samples());
        running = frontend.poll_events(gb.bus.joypad);
    }
#else
    // Without a window: run one second and print the screen as text
    for (int frame = 0; frame < 60; frame++)
    {
        gb.run_frame();
    }
    const char shades[] = " .:#";
    for (int y = 0; y < SCREEN_HEIGHT; y++)
    {
        for (int x = 0; x < SCREEN_WIDTH; x++)
            putchar(shades[gb.ppu.framebuffer[y * SCREEN_WIDTH + x]]);
        putchar('\n');
    }
#endif

    if (!gb.bus.save_ram(save_path))
    {
        cerr << "Failed to write save file: " << save_path << "\n";
        return 1;
    }
    return 0;
}
