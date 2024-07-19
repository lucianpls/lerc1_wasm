// Lerc1 C API, minimal wrapper for decoding
#include <stdlib.h>
#if defined __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {
    // Take a look at the lerc blob without decoding
    // returns a json string or nullptr on error
    // Json string contains
    // - height
    // - width
    // - precision (quantification step)
    // - needs_ndv, which can be:
    //   0  -> data does not contain NDV values
    //   >0 -> data contains some NDV values
    //   <0 -> data contains only NDV values
    //  

    EMSCRIPTEN_KEEPALIVE
    char *getwh(void *data, size_t sz);

    // Full decode to float, checks that expected decompressed size matches
    // returns false on any error
    // Lerc1 does not store the NDV value, so the caller has to pick
    // what value to use if getwh signals that NDV are present
    // 
    // outsz has to be exactly w * h * 4 (float array size)
    // message should hold at least 1024 bytes
    // If decode() returns false, the message will hold explanation
    EMSCRIPTEN_KEEPALIVE
    int decode(void *data, size_t sz, float ndv, float *values, size_t outsz, char *message);
}