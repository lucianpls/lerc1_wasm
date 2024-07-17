// Lerc1 C API, minimal wrapper for decoding
#include <stdlib.h>
#if defined __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {
    // Take a look at data without decoding, fill w and h, return false on error
    // int getwh(void *data, size_t sz, int *w, int*h, int *has_ndv, double *precision);
    EMSCRIPTEN_KEEPALIVE
    void *getwh(void *data, size_t sz);

    // Full decode to float, checks that expected decompressed size matches
    // returns false on any error
    // Lerc1 doesn't store the NDV values, so if they do exist they will be filled with ndv
    // outsz should be exactly w * h * 4 (float array size)
    // message should hold at least 1024 bytes
    // If decode() returns false, the message will hold  explanation
    EMSCRIPTEN_KEEPALIVE
    int decode(void *data, size_t sz, float ndv, float *values, size_t outsz, char *message);
}