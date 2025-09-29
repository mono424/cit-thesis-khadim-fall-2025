// bind.cpp
#include <emscripten/bind.h>
#include <array>
#include "library.h"

using namespace emscripten;

namespace
{
    std::array<float, 4> getIntrinsicParamsWrapper(const IntrinsicParameters& params)
    {
        std::array<float, 4> result;
        params.getIntrinsicParams(result);
        return result;
    }
}

EMSCRIPTEN_BINDINGS (xylt_module)
{
    value_array<std::array<float, 6>>("FloatArray6")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
        .element(emscripten::index<4>())
        .element(emscripten::index<5>());

    value_array<std::array<float, 2>>("FloatArray2")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>());

    value_array<std::array<float, 4>>("FloatArray4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>());

    register_vector<float>("VectorFloat");

    class_<IntrinsicParameters>("IntrinsicParameters")
        .constructor<>()
        .constructor<float, float, float, float, unsigned int, unsigned int, std::array<float, 6>, std::array<float, 2>>()
        .constructor<const IntrinsicParameters&>()
        .property("fov_x", &IntrinsicParameters::fov_x)
        .property("fov_y", &IntrinsicParameters::fov_y)
        .property("c_x", &IntrinsicParameters::c_x)
        .property("c_y", &IntrinsicParameters::c_y)
        .property("width", &IntrinsicParameters::width)
        .property("height", &IntrinsicParameters::height)
        .property("radial_distortion", &IntrinsicParameters::radial_distortion)
        .property("tangential_distortion", &IntrinsicParameters::tangential_distortion)
        .property("metric_radius", &IntrinsicParameters::metric_radius)
        .function("getIntrinsicParams", &getIntrinsicParamsWrapper)
        .function("equals", &IntrinsicParameters::operator==);

    class_<XYTableData>("XYTableData")
        .constructor<>()
        .property("width", &XYTableData::width)
        .property("height", &XYTableData::height)
        .property("data", &XYTableData::data);

    class_<std::shared_ptr<XYTableData>>("XYTableDataPtr")
        .constructor<>()
        .function("get", &std::shared_ptr<XYTableData>::get, allow_raw_pointers());

    function("create_xy_lookup_table", &create_xy_lookup_table);
}
