if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/vishvendrasingh/.gradle/caches/transforms-4/36db26668190107aaeb4abcd6b50e8d1/transformed/hermes-android-0.73.11-debug/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vishvendrasingh/.gradle/caches/transforms-4/36db26668190107aaeb4abcd6b50e8d1/transformed/hermes-android-0.73.11-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

