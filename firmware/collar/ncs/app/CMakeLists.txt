cmake_minimum_required(VERSION 3.20.0)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(emopet_tag_p0)

target_sources(app PRIVATE
  src/main.c
  src/emopet_gatt.c
  ${CMAKE_CURRENT_SOURCE_DIR}/../../main/sensors/activity_variability.c
  ${CMAKE_CURRENT_SOURCE_DIR}/../../main/transport/activity_feature_summary.c
)

target_include_directories(app PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/../../main/sensors
  ${CMAKE_CURRENT_SOURCE_DIR}/../../main/transport
)
