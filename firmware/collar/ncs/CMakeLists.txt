cmake_minimum_required(VERSION 3.20.0)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(emopet_tag)

set(EMOPET_COLLAR_MAIN ${CMAKE_CURRENT_SOURCE_DIR}/../main)

target_sources(app PRIVATE
  src/main.c
  src/emopet_gatt.c
  ${EMOPET_COLLAR_MAIN}/transport/activity_feature_summary.c
  ${EMOPET_COLLAR_MAIN}/transport/clock_anchor_transport.c
  ${EMOPET_COLLAR_MAIN}/sensors/activity_variability.c
)

target_include_directories(app PRIVATE
  src
  ${EMOPET_COLLAR_MAIN}/transport
  ${EMOPET_COLLAR_MAIN}/sensors
)
