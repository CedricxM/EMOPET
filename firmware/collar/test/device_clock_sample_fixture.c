#include <assert.h>
#include <stdint.h>
#include <stdio.h>

#include "../main/transport/device_clock_sample.h"

static void print_hex(const uint8_t *bytes, size_t length)
{
    for (size_t i = 0; i < length; ++i) printf("%02x", bytes[i]);
    printf("\n");
}

int main(void)
{
    uint8_t frame[TAG_DEVICE_CLOCK_SAMPLE_FRAME_SIZE];

    assert(tag_device_clock_sample_encode(
        0x10203040u,
        0x89abcdefu,
        frame,
        sizeof(frame)
    ) == TAG_DEVICE_CLOCK_SAMPLE_OK);

    print_hex(frame, sizeof(frame));

    assert(tag_device_clock_sample_encode(
        0u,
        0u,
        frame,
        sizeof(frame)
    ) == TAG_DEVICE_CLOCK_SAMPLE_OK);

    print_hex(frame, sizeof(frame));
    return 0;
}
