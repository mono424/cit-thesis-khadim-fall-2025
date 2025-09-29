cmake_minimum_required(VERSION 3.28)
project(xylt LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)

include(GNUInstallDirs)

find_package(Eigen3 REQUIRED)

if (NOT EMSCRIPTEN)
    find_package(Python3 COMPONENTS Interpreter Development)
    find_package(pybind11 REQUIRED)
    # Extract Python version
    set(PYTHON_VERSION_MAJOR ${Python3_VERSION_MAJOR})
    set(PYTHON_VERSION_MINOR ${Python3_VERSION_MINOR})
    set(PYTHON_VERSION "${PYTHON_VERSION_MAJOR}.${PYTHON_VERSION_MINOR}")
endif()

# c++ library for XY Table Computation
add_library(xylt lib/library.cpp lib/library.h)

target_include_directories(xylt PUBLIC
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}>/include
        $<INSTALL_INTERFACE:include>
        PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(xylt PRIVATE Eigen3::Eigen)

install(TARGETS xylt EXPORT xyltConfig
        ARCHIVE  DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY  DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(EXPORT xyltConfig DESTINATION share/xylt/cmake)

export(TARGETS xylt FILE xyltConfig.cmake)

install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/lib/library.h" DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/xylt/ )

# we cannot build wasm and python bindings in the same pass.
if(EMSCRIPTEN)
    # wasm cross-compilation (use docs/wasm_profile to build with conan)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME='XyltModule'")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME='XyltModule' -lembind")
    add_executable(xylt_wasm lib/emscripten_bindings.cpp lib/library.cpp)
    target_include_directories(xylt_wasm PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
    target_link_libraries(xylt_wasm PRIVATE Eigen3::Eigen)

    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/xylt_wasm.js" DESTINATION share/xylt_wasm/)
    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/xylt_wasm.wasm" DESTINATION share/xylt_wasm/)
else()
    # python bindings
    pybind11_add_module(pyxylt lib/python_bindings.cpp lib/library.cpp)
    target_link_libraries(pyxylt PRIVATE Eigen3::Eigen)
    target_include_directories(pyxylt PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
    target_include_directories(pyxylt PUBLIC ${Python3_NumPy_INCLUDE_DIRS})

    set(PYTHON_LIB_DYNLOAD_DIR "lib/python${PYTHON_VERSION}/lib-dynload")
    install(TARGETS pyxylt
            LIBRARY DESTINATION ${PYTHON_LIB_DYNLOAD_DIR}
            ARCHIVE DESTINATION ${PYTHON_LIB_DYNLOAD_DIR}
            RUNTIME DESTINATION ${PYTHON_LIB_DYNLOAD_DIR})
endif()
