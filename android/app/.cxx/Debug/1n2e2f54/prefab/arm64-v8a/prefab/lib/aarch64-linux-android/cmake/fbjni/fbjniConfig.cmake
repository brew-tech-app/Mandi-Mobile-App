if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/Users/vishvendrasingh/.gradle/caches/transforms-3/5c6e284c9ccc91cdbca1aa9491aa2b90/transformed/fbjni-0.5.1/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vishvendrasingh/.gradle/caches/transforms-3/5c6e284c9ccc91cdbca1aa9491aa2b90/transformed/fbjni-0.5.1/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

