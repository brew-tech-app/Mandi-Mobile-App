if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/vishvendrasingh/.gradle/caches/transforms-3/a034133df188bc3fc6936f2a6521d3c7/transformed/hermes-android-0.73.11-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vishvendrasingh/.gradle/caches/transforms-3/a034133df188bc3fc6936f2a6521d3c7/transformed/hermes-android-0.73.11-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

