if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/vishvendrasingh/.gradle/caches/transforms-4/8e8095e05cf2371aa87134382dc19302/transformed/hermes-android-0.73.11-release/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vishvendrasingh/.gradle/caches/transforms-4/8e8095e05cf2371aa87134382dc19302/transformed/hermes-android-0.73.11-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

