#include <stdlib.h>
#include <cstdint>
#include <algorithm>
#include <cmath>

#if defined __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {
    // convert float to RGBA
    EMSCRIPTEN_KEEPALIVE
    int topixel8(float *, size_t, double, double, uint32_t *);
    EMSCRIPTEN_KEEPALIVE
    int hillshade(float *, size_t, double pixel_size, double sun_angle, uint32_t *);
    EMSCRIPTEN_KEEPALIVE
    int applypalette(uint32_t *, uint32_t *, size_t);
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

// Adds hillshade from data to pixels
//
// WARNING: This is not quite correct, it is very quick and dirty
// Only for demonstration
//
int hillshade(float *data, size_t sz, double pixel_size, double sun_angle, uint32_t *pixels)
{
    if (sz != 257 * 257 * 4)
        return 0;

    constexpr int TILESIZE(256);
    constexpr int DATATILESIZE(257);
    constexpr uint32_t ALPHA(0xff000000);
    constexpr auto base(32.0); // baseline brightness
    constexpr auto rescale((256 - base) / 256); // brightness rescale factor
    for (int y = 0; y < TILESIZE; y++)
    {
        for (int x = 0; x < TILESIZE; x++)
        {
            double leftp = data[(y + 1) * DATATILESIZE + x + 1];
            double rightp = data[y * DATATILESIZE + x];
            double slope = (rightp - leftp) / 1.41 / pixel_size;
            double normal_angle = std::asin(slope) - sun_angle + M_PI_2;
            double factor = abs(std::cos(normal_angle)); // 0 to 1
            // negative power decrease the effect, positive increase it
            // -2 is a good value for a subtle effect
            factor = sqrt(factor);

            uint32_t val = pixels[TILESIZE * y + x];
            uint32_t red = val & 0xff;
            uint32_t green = (val >> 8) & 0xff;
            uint32_t blue = (val >> 16) & 0xff;
            uint32_t alpha = (val >> 24) & 0xff;
            red = (base + rescale * red) * factor;
            green = (base + rescale * green) * factor;
            blue = (base + rescale * blue) * factor;

            pixels[TILESIZE * y + x] = ALPHA | (blue << 16) | (green << 8) | red;
        }
    }
    return 1;
}

// Apply the pallete to the lower byte of the pixels.
// Assumes palette has 256 entries
int applypalette(uint32_t *palette, uint32_t * pixel, size_t sz)
{
    for (int i=0; i < sz; i++)
        pixel[i] = palette[pixel[i] & 0xff];
    return int(sz);
}