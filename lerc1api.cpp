#include "lerc1api.h"
#include "Lerc1Image.h"
#include "json.hpp"
#include <string.h>
#include <inttypes.h>

USING_NAMESPACE_LERC1
using namespace nlohmann;

static int getwh(void *data, size_t sz, int *w, int*h, int *has_ndv, double *precision) {
    if (sz < Lerc1Image::computeNumBytesNeededToWriteVoidImage())
        return false;
    auto d = (Byte *)data;
    // unaligned reads, assumes little endian
    // safe because the test above means sz >= 67
    memcpy(precision, d + 26, 8);
    // Next two integers have to be zero
    memcpy(has_ndv, d + 34, 4);
    if (*has_ndv)
        return false;
    memcpy(has_ndv, d + 38, 4);
    if (*has_ndv)
        return false;
    // ndv mask size. If >0, ndv is needed
    memcpy(has_ndv, d + 42, 4);
    if (0 == *has_ndv) {
        // If no mask, it could still be all invalid
        float mask_val;
        memcpy(&mask_val, d + 46, 4);
        // Only 0.0 and 1.0 are acceptable
        if (mask_val != 0.0 && mask_val != 1.0)
            return false;
        // return -1 if image is all ndv
        *has_ndv = -(mask_val == 0.0);
    }

    return Lerc1Image::getwh(d, sz, *w, *h);
}

// returns UTF8 json string that needs to be freed by caller
char *getwh(void *data, size_t sz) {
    int w, h, has_mask;
    double precision;
    if (!getwh(data, sz, &w, &h, &has_mask, &precision))
        return nullptr;
    json response;
    response["width"] = w;
    response["height"] = h;
    response["precision"] = precision;
    response["needs_ndv"] = has_mask;
    auto s = response.dump(); // string, on stack
    // Make a heap copy
    char *buffer = (char *) malloc(s.size() + 1);
    strncpy(buffer, s.c_str(), s.size() + 1);
    return buffer;
}


int decode(void *data, size_t sz, float ndv, float *values, size_t outsz, char *message) {
    int w, h, has_ndv;
    double precision;
    if (!getwh(data, sz, &w, &h, &has_ndv, &precision)) {
        strcpy(message, "Can't read input data as Lerc1");
        return false; // Failure
    }
    if (size_t(4) * w * h != outsz) {
        strcpy(message, "Invalid output buffer");
        return false; // Not matching expected output
    }

    // // Skip decoding if all data is NDV
    // if (has_ndv < 0) {
    //     for (int i = 0; i < w * h; i++)
    //         values[i] = ndv;
    //     return true;
    // }

    Lerc1Image zImg;
    auto ptr = (Byte *)data;
    auto size(sz);
    // Precision is minimum required, should always work with 
    // any value slightly larger than the one in the file
    // Slightly because of floating point flicker
    if (!zImg.read(&ptr, size, precision)) {
        strcpy(message, "Error reading data");
        return false;
    }
    // Copy the whole data array
    memcpy(values, zImg.data(), zImg.getSize() * 4);
    // Only if needed, saves some time
    // otherwise those values are zero
    if (has_ndv)
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (!zImg.IsValid(y, x))
                    values[y * w + x] = ndv;
    return true;
}
