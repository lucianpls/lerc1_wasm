#include <stdlib.h>
#include <cstdint>
#include <algorithm>

#if defined __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {
    // convert float to RGBA
    EMSCRIPTEN_KEEPALIVE
    int topixel8(float *, size_t, double, double, uint32_t *);
};

// saturation linear strech from minval to maxval
// it only works while converting 257 * 257 float to 256 * 256 RGBA, clipping last line and colum
int topixel8(float *data, size_t sz, double minval, double maxval, uint32_t *pixels)
{
    if (sz != 257 * 257 * 4)
        return 0;

    constexpr int TILESIZE(256);
    constexpr uint32_t ALPHA(0xff000000);
    auto s(data);
    auto d(pixels);
    float ramp(255 / (maxval - minval));
    // ramp = 1;
    for (int y = 0; y < TILESIZE; y++, s++)
    {
        for (int x = 0; x < TILESIZE; x++)
        {
            float val = ramp * (*s++ - minval);
            *d++ = ALPHA | 0x10101 * uint32_t(std::min(255.0f, std::max(0.0f, val)));
        }
    }
    return 1;
}