#include <pybind11/eigen.h>
#include <pybind11/functional.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "library.h"

namespace py = pybind11;

PYBIND11_MODULE(pyxylt, m)
{
    m.doc() = "Python bindings for XY Lookup Table Library";
    py::class_<IntrinsicParameters>(m, "IntrinsicParameters",
                                    "Camera intrinsic parameters including focal lengths, principal point, distortion coefficients etc")
        .def(py::init<>(), "Default constructor")
        .def(py::init<float, float, float, float, unsigned int, unsigned int, std::array<float, 6>,
                      std::array<float, 2>>(),
             "Constructor with all parameters",
             py::arg("fov_x"), py::arg("fov_y"), py::arg("c_x"), py::arg("c_y"),
             py::arg("width"), py::arg("height"), py::arg("radial_distortion"),
             py::arg("tangential_distortion"))
        .def(py::init<const IntrinsicParameters &>(), "Copy constructor")
        .def_readwrite("fov_x", &IntrinsicParameters::fov_x, "Field of view in x direction")
        .def_readwrite("fov_y", &IntrinsicParameters::fov_y, "Field of view in y direction")
        .def_readwrite("c_x", &IntrinsicParameters::c_x, "Principal point x coordinate")
        .def_readwrite("c_y", &IntrinsicParameters::c_y, "Principal point y coordinate")
        .def_readwrite("width", &IntrinsicParameters::width, "Image width in pixels")
        .def_readwrite("height", &IntrinsicParameters::height, "Image height in pixels")
        .def_readwrite("radial_distortion", &IntrinsicParameters::radial_distortion,
                       "Radial distortion coefficients (6)")
        .def_readwrite("tangential_distortion", &IntrinsicParameters::tangential_distortion,
                       "Tangential distortion coefficients (2)")
        .def_readwrite("metric_radius", &IntrinsicParameters::metric_radius, "Metric radius")
        .def("__eq__", &IntrinsicParameters::operator==, "Compare two IntrinsicParameters for equality")
        .def("get_intrinsic_params", &IntrinsicParameters::getIntrinsicParams, "Get intrinsic parameters as array");

    py::class_<XYTableData, std::shared_ptr<XYTableData>>(m, "XYTableData",
                                                          "XY lookup table data containing width, height and the actual lookup values")
        .def(py::init<>(), "Default constructor")
        .def_readwrite("width", &XYTableData::width, "Width of the lookup table")
        .def_readwrite("height", &XYTableData::height, "Height of the lookup table")
        .def_readwrite("data", &XYTableData::data, "Lookup table data");

    // Proper wrapper that handles shared_ptr reference semantics correctly
    m.def("create_xy_lookup_table", [](const IntrinsicParameters &calib, std::shared_ptr<XYTableData> xy_table) -> bool
          {
              // The C++ function expects a reference to shared_ptr and will replace it entirely
              // We need to pass a local shared_ptr by reference, then copy results back
              std::shared_ptr<XYTableData> result_ptr;
              bool success = create_xy_lookup_table(calib, result_ptr);
              
              if (success && result_ptr) {
                  // Copy the results to the Python object
                  xy_table->width = result_ptr->width;
                  xy_table->height = result_ptr->height;
                  xy_table->data = result_ptr->data;
              }
              
              return success; }, "Create XY lookup table from camera parameters", py::arg("calib"), py::arg("xy_table"));
}
