from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMake, CMakeDeps, cmake_layout
from conan.tools.build import check_min_cppstd


class XyltRecipe(ConanFile):
    name = "xylt"
    version = "1.0.0"
    package_type = "library"

    # Optional metadata
    license = "MIT"
    author = ""
    url = ""
    description = "XY Lookup Table Library"
    topics = ("lookup-table", "computer-vision")

    # Binary configuration
    settings = "os", "compiler", "build_type", "arch"
    options = {"shared": [True, False], "fPIC": [True, False]}
    default_options = {"shared": False, "fPIC": True}

    # Sources are located in the same place as this recipe
    exports_sources = "CMakeLists.txt", "lib/*"

    def requirements(self):
        self.requires("eigen/3.4.0")
        self.requires("pybind11/2.13.6")

    def validate(self):
        check_min_cppstd(self, "17")

    def config_options(self):
        if self.settings.os == "Windows":
            del self.options.fPIC

    def layout(self):
        cmake_layout(self)

    def generate(self):
        tc = CMakeToolchain(self)
        tc.generate()

        deps = CMakeDeps(self)
        deps.generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()

    def package(self):
        cmake = CMake(self)
        cmake.install()

    def package_info(self):
        self.cpp_info.libs = ["xylt"]
