#include "gb/timer.hpp"

namespace gb
{
    namespace
    {
        // CPU cycles per TIMA increment for each TAC clock select
        constexpr int PERIODS[] = {1024, 16, 64, 256};
    }

    bool Timer::tick(int cycles)
    {
        div = static_cast<u16>(div + cycles);
        if (!(tac & 0x04))
        {
            return false;
        }

        int period = PERIODS[tac & 0x03];
        timer_counter += cycles;
        while (timer_counter >= period)
        {
            timer_counter -= period;
            if (tima == 0xFF)
            {
                tima = tma;
                return true;
            }
            tima++;
        }
        return false;
    }
}
