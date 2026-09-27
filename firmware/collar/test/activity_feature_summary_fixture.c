#include <assert.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>

#include "../main/sensors/activity_variability.h"
#include "../main/transport/activity_feature_summary.h"

static void print_hex(const uint8_t *bytes, size_t length)
{
    for (size_t i = 0; i < length; ++i) printf("%02x", bytes[i]);
    printf("\n");
}

static void prove_snapshot_semantics(void)
{
    activity_variability_init();
    for (uint32_t i = 1; i <= 899; ++i) {
        activity_variability_push(1.0f, false, (uint64_t)i * 1000u);
    }
    activity_variability_snapshot_t snapshot =
        activity_variability_snapshot(899000u);
    assert(snapshot.status == ACTIVITY_VARIABILITY_NOT_OBSERVED_INSUFFICIENT_COVERAGE);
    assert(snapshot.valid_seconds == 899u);
    assert(isnan(snapshot.value));

    activity_variability_push(1.0f, false, 900000u);
    snapshot = activity_variability_snapshot(900000u);
    assert(snapshot.status == ACTIVITY_VARIABILITY_OBSERVED);
    assert(snapshot.valid_seconds == 900u);
    assert(fabsf(snapshot.value) < 1e-6f);

    activity_variability_init();
    for (uint32_t i = 1; i <= 900; ++i) {
        activity_variability_push(0.0005f, false, (uint64_t)i * 1000u);
    }
    snapshot = activity_variability_snapshot(900000u);
    assert(snapshot.status == ACTIVITY_VARIABILITY_NOT_OBSERVED_MEAN_BELOW_DIVISION_GUARD);
    assert(snapshot.valid_seconds == 900u);
    assert(isnan(snapshot.value));

    activity_variability_init();
    for (uint32_t i = 0; i <= 1800; ++i) {
        activity_variability_push(1.0f, false, (uint64_t)i * 1000u);
    }
    snapshot = activity_variability_snapshot(1800000u);
    assert(snapshot.status == ACTIVITY_VARIABILITY_OBSERVED);
    assert(snapshot.valid_seconds == 1800u);
}

int main(void)
{
    uint8_t frame[TAG_FEATURE_SUMMARY_FRAME_SIZE];

    prove_snapshot_semantics();

    tag_activity_feature_summary_input_t observed = {
        .sequence = 65535u,
        .boot_session_id = 0x10203040u,
        .window_end_ms = 3600000u,
        .observation = {
            .status = ACTIVITY_VARIABILITY_OBSERVED,
            .valid_seconds = 1700u,
            .value = 0.42f,
        },
        .quality = TAG_FEATURE_QUALITY_VALID,
    };

    assert(tag_feature_summary_encode_activity_variability(
        &observed, frame, sizeof(frame)) == TAG_FEATURE_SUMMARY_OK);
    print_hex(frame, sizeof(frame));

    tag_activity_feature_summary_input_t absent = {
        .sequence = 7u,
        .boot_session_id = 0x10203040u,
        .window_end_ms = 3600000u,
        .observation = {
            .status = ACTIVITY_VARIABILITY_NOT_OBSERVED_INSUFFICIENT_COVERAGE,
            .valid_seconds = 400u,
            .value = NAN,
        },
        .quality = TAG_FEATURE_QUALITY_DEGRADED,
    };

    assert(tag_feature_summary_encode_activity_variability(
        &absent, frame, sizeof(frame)) == TAG_FEATURE_SUMMARY_OK);
    print_hex(frame, sizeof(frame));

    observed.quality = TAG_FEATURE_QUALITY_SUPPRESSED;
    assert(tag_feature_summary_encode_activity_variability(
        &observed, frame, sizeof(frame)) == TAG_FEATURE_SUMMARY_INVALID_SEMANTICS);

    return 0;
}
