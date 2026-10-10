#include "gb/cpu.hpp"
#include <cstdio>
#include <cstdlib>

namespace gb {

    namespace
    {
        // Register pairs in bits 4-5 of the opcode: BC, DE, HL, SP
        u16 &pair(Registers &regs, int index)
        {
            switch (index)
            {
            case 0:
                return regs.bc;
            case 1:
                return regs.de;
            case 2:
                return regs.hl;
            default:
                return regs.sp;
            }
        }

        // Conditions in bits 3-4 of the opcode: NZ, Z, NC, C
        bool condition(const Registers &regs, int index)
        {
            bool set = regs.flag(index < 2 ? Registers::FLAG_Z : Registers::FLAG_C);
            return (index & 1) ? set : !set;
        }
    }

    int CPU::execute(u8 opcode)
    {
        // Register index encoding (B,C,D,E,H,L,(HL),A = 0..7) is the same for every group below
        int y = (opcode >> 3) & 7;
        int p = (opcode >> 4) & 3;

        // 0x40-0x7F: LD r,r'. 0x76 is HALT.
        if (opcode >= 0x40 && opcode <= 0x7F && opcode != 0x76)
        {
            int src = opcode & 7;
            write_r8(y, read_r8(src));
            return (src == 6 || y == 6) ? 8 : 4;
        }

        // 0x80-0xBF: ALU A,r. Op index 0..7 = ADD,ADC,SUB,SBC,AND,XOR,OR,CP.
        if (opcode >= 0x80 && opcode <= 0xBF)
        {
            int src = opcode & 7;
            alu_op(y, read_r8(src));
            return (src == 6) ? 8 : 4;
        }

        if ((opcode & 0xC7) == 0x04) // INC r
        {
            u8 value = read_r8(y);
            u8 result = static_cast<u8>(value + 1);
            write_r8(y, result);
            regs.set_flag(Registers::FLAG_Z, result == 0);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, (value & 0x0F) == 0x0F);
            return (y == 6) ? 12 : 4;
        }

        if ((opcode & 0xC7) == 0x05) // DEC r
        {
            u8 value = read_r8(y);
            u8 result = static_cast<u8>(value - 1);
            write_r8(y, result);
            regs.set_flag(Registers::FLAG_Z, result == 0);
            regs.set_flag(Registers::FLAG_N, true);
            regs.set_flag(Registers::FLAG_H, (value & 0x0F) == 0x00);
            return (y == 6) ? 12 : 4;
        }

        if ((opcode & 0xC7) == 0x06) // LD r,n
        {
            write_r8(y, fetch8());
            return (y == 6) ? 12 : 8;
        }

        if ((opcode & 0xCF) == 0x01) // LD rr,nn
        {
            pair(regs, p) = fetch16();
            return 12;
        }

        if ((opcode & 0xCF) == 0x03) // INC rr
        {
            pair(regs, p)++;
            return 8;
        }

        if ((opcode & 0xCF) == 0x0B) // DEC rr
        {
            pair(regs, p)--;
            return 8;
        }

        if ((opcode & 0xCF) == 0x09) // ADD HL,rr
        {
            u16 hl = regs.hl, rr = pair(regs, p);
            u32 result = static_cast<u32>(hl) + rr;
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, ((hl & 0x0FFF) + (rr & 0x0FFF)) > 0x0FFF);
            regs.set_flag(Registers::FLAG_C, result > 0xFFFF);
            regs.hl = static_cast<u16>(result);
            return 8;
        }

        if ((opcode & 0xE7) == 0x20) // JR cc,e
        {
            i8 offset = static_cast<i8>(fetch8());
            if (!condition(regs, y & 3))
            {
                return 8;
            }
            regs.pc = static_cast<u16>(regs.pc + offset);
            return 12;
        }

        if ((opcode & 0xE7) == 0xC0) // RET cc
        {
            if (!condition(regs, y & 3))
            {
                return 8;
            }
            regs.pc = pop16();
            return 20;
        }

        if ((opcode & 0xE7) == 0xC2) // JP cc,nn
        {
            u16 addr = fetch16();
            if (!condition(regs, y & 3))
            {
                return 12;
            }
            regs.pc = addr;
            return 16;
        }

        if ((opcode & 0xE7) == 0xC4) // CALL cc,nn
        {
            u16 addr = fetch16();
            if (!condition(regs, y & 3))
            {
                return 12;
            }
            push16(regs.pc);
            regs.pc = addr;
            return 24;
        }

        if ((opcode & 0xCF) == 0xC1) // POP rr, where the fourth pair is AF
        {
            u16 value = pop16();
            if (p == 3)
            {
                regs.af = value & 0xFFF0; // the low nibble of F is always 0
            }
            else
            {
                pair(regs, p) = value;
            }
            return 12;
        }

        if ((opcode & 0xCF) == 0xC5) // PUSH rr, where the fourth pair is AF
        {
            push16(p == 3 ? regs.af : pair(regs, p));
            return 16;
        }

        if ((opcode & 0xC7) == 0xC6) // ALU A,n
        {
            alu_op(y, fetch8());
            return 8;
        }

        if ((opcode & 0xC7) == 0xC7) // RST
        {
            push16(regs.pc);
            regs.pc = opcode & 0x38;
            return 16;
        }

        switch (opcode)
        {
        case 0x00: // NOP
            return 4;

        case 0x02: // LD (BC),A
            bus.write(regs.bc, regs.a);
            return 8;

        case 0x07: // RLCA
        {
            u8 carry = (regs.a & 0x80) ? 1 : 0;
            regs.a = static_cast<u8>((regs.a << 1) | carry);
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, carry != 0);
            return 4;
        }

        case 0x08: // LD (nn),SP
        {
            u16 addr = fetch16();
            bus.write(addr, static_cast<u8>(regs.sp & 0xFF));
            bus.write(static_cast<u16>(addr + 1), static_cast<u8>(regs.sp >> 8));
            return 20;
        }

        case 0x0A: // LD A,(BC)
            regs.a = bus.read(regs.bc);
            return 8;

        case 0x0F: // RRCA
        {
            u8 carry = regs.a & 0x01;
            regs.a = static_cast<u8>((regs.a >> 1) | (carry << 7));
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, carry != 0);
            return 4;
        }

        case 0x10: // STOP
            fetch8(); // the padding byte
            halted = true;
            return 4;

        case 0x12: // LD (DE),A
            bus.write(regs.de, regs.a);
            return 8;

        case 0x17: // RLA
        {
            u8 old_carry = regs.flag(Registers::FLAG_C) ? 1 : 0;
            u8 new_carry = (regs.a & 0x80) ? 1 : 0;
            regs.a = static_cast<u8>((regs.a << 1) | old_carry);
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, new_carry != 0);
            return 4;
        }

        case 0x18: // JR e
        {
            i8 offset = static_cast<i8>(fetch8());
            regs.pc = static_cast<u16>(regs.pc + offset);
            return 12;
        }

        case 0x1A: // LD A,(DE)
            regs.a = bus.read(regs.de);
            return 8;

        case 0x1F: // RRA
        {
            u8 old_carry = regs.flag(Registers::FLAG_C) ? 1 : 0;
            u8 new_carry = regs.a & 0x01;
            regs.a = static_cast<u8>((regs.a >> 1) | (old_carry << 7));
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, new_carry != 0);
            return 4;
        }

        case 0x22: // LD (HL+),A
            bus.write(regs.hl, regs.a);
            regs.hl++;
            return 8;

        case 0x27: // DAA
        {
            int a = regs.a;
            u8 correction = 0;
            bool carry = regs.flag(Registers::FLAG_C);

            if (regs.flag(Registers::FLAG_H) || (!regs.flag(Registers::FLAG_N) && (a & 0x0F) > 9))
                correction |= 0x06;

            if (regs.flag(Registers::FLAG_C) || (!regs.flag(Registers::FLAG_N) && a > 0x99))
            {
                correction |= 0x60;
                carry = true;
            }

            a += regs.flag(Registers::FLAG_N) ? -correction : correction;
            regs.a = static_cast<u8>(a);

            regs.set_flag(Registers::FLAG_Z, regs.a == 0);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, carry);
            return 4;
        }

        case 0x2A: // LD A,(HL+)
            regs.a = bus.read(regs.hl);
            regs.hl++;
            return 8;

        case 0x2F: // CPL
            regs.a = static_cast<u8>(~regs.a);
            regs.set_flag(Registers::FLAG_N, true);
            regs.set_flag(Registers::FLAG_H, true);
            return 4;

        case 0x32: // LD (HL-),A
            bus.write(regs.hl, regs.a);
            regs.hl--;
            return 8;

        case 0x37: // SCF
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, true);
            return 4;

        case 0x3A: // LD A,(HL-)
            regs.a = bus.read(regs.hl);
            regs.hl--;
            return 8;

        case 0x3F: // CCF
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, false);
            regs.set_flag(Registers::FLAG_C, !regs.flag(Registers::FLAG_C));
            return 4;

        case 0x76: // HALT
            halted = true;
            return 4;

        case 0xC3: // JP nn
            regs.pc = fetch16();
            return 16;

        case 0xC9: // RET
            regs.pc = pop16();
            return 16;

        case 0xCD: // CALL nn
        {
            u16 addr = fetch16();
            push16(regs.pc);
            regs.pc = addr;
            return 24;
        }

        case 0xD9: // RETI
            regs.pc = pop16();
            ime = true;
            return 16;

        case 0xE0: // LDH (n),A
            bus.write(static_cast<u16>(0xFF00 + fetch8()), regs.a);
            return 12;

        case 0xE2: // LDH (C),A
            bus.write(static_cast<u16>(0xFF00 + regs.c), regs.a);
            return 8;

        case 0xE8: // ADD SP,e
        {
            i8 offset = static_cast<i8>(fetch8());
            u16 sp = regs.sp;
            u8 low = static_cast<u8>(offset);
            bool h = ((sp & 0x0F) + (low & 0x0F)) > 0x0F;
            bool c = ((sp & 0xFF) + low) > 0xFF;
            regs.sp = static_cast<u16>(sp + offset);
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, h);
            regs.set_flag(Registers::FLAG_C, c);
            return 16;
        }

        case 0xE9: // JP HL
            regs.pc = regs.hl;
            return 4;

        case 0xEA: // LD (nn),A
            bus.write(fetch16(), regs.a);
            return 16;

        case 0xF0: // LDH A,(n)
            regs.a = bus.read(static_cast<u16>(0xFF00 + fetch8()));
            return 12;

        case 0xF2: // LDH A,(C)
            regs.a = bus.read(static_cast<u16>(0xFF00 + regs.c));
            return 8;

        case 0xF3: // DI
            ime = false;
            return 4;

        case 0xF8: // LD HL,SP+e
        {
            i8 offset = static_cast<i8>(fetch8());
            u16 sp = regs.sp;
            u8 low = static_cast<u8>(offset);
            bool h = ((sp & 0x0F) + (low & 0x0F)) > 0x0F;
            bool c = ((sp & 0xFF) + low) > 0xFF;
            regs.hl = static_cast<u16>(sp + offset);
            regs.set_flag(Registers::FLAG_Z, false);
            regs.set_flag(Registers::FLAG_N, false);
            regs.set_flag(Registers::FLAG_H, h);
            regs.set_flag(Registers::FLAG_C, c);
            return 12;
        }

        case 0xF9: // LD SP,HL
            regs.sp = regs.hl;
            return 8;

        case 0xFA: // LD A,(nn)
            regs.a = bus.read(fetch16());
            return 16;

        case 0xFB: // EI
            ime_delay = 2;
            return 4;

        default:
            fprintf(stderr, "Unknown opcode: 0x%02X at PC=0x%04X\n", opcode, static_cast<unsigned>(regs.pc - 1));
            abort();
        }
    }

}
