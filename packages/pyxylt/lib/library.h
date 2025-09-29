#ifndef XYLT_LIBRARY_H
#define XYLT_LIBRARY_H

#include <array>
#include <vector>
#include <memory>

struct IntrinsicParameters
{
    float fov_x{0.};
    float fov_y{0.};
    float c_x{0.};
    float c_y{0.};
    unsigned int width{0};
    unsigned int height{0};
    std::array<float, 6> radial_distortion;
    std::array<float, 2> tangential_distortion;
    float metric_radius{1.7f};

    IntrinsicParameters() = default;
    IntrinsicParameters(float _fov_x, float _fov_y, float _c_x, float _c_y, unsigned int _width, unsigned int _height,
                        std::array<float, 6> _radial_distortion,
                        std::array<float, 2> _tangential_distortion)
        : fov_x(_fov_x), fov_y(_fov_y), c_x(_c_x), c_y(_c_y), width(_width), height(_height), radial_distortion(std::move(_radial_distortion)), tangential_distortion(std::move(_tangential_distortion)) {}

    IntrinsicParameters(const IntrinsicParameters &other)
        : fov_x(other.fov_x), fov_y(other.fov_y), c_x(other.c_x), c_y(other.c_y), width(other.width), height(other.height), radial_distortion(other.radial_distortion), tangential_distortion(other.tangential_distortion) {}

    bool operator==(const IntrinsicParameters &other) const
    {
        return fov_x == other.fov_x && fov_y == other.fov_y &&
               c_x == other.c_x && c_y == other.c_y &&
               width == other.width && height == other.height &&
               radial_distortion == other.radial_distortion &&
               tangential_distortion == other.tangential_distortion;
    }

    void getIntrinsicParams(std::array<float, 4> &params) const
    {
        params[0] = fov_x;
        params[1] = fov_y;
        params[2] = c_x;
        params[3] = c_y;
    }
};

struct XYTableData
{
    unsigned int width;
    unsigned int height;
    std::vector<float> data;
};

bool create_xy_lookup_table(
    const IntrinsicParameters &calib,
    std::shared_ptr<XYTableData> &xy_table);

#endif // XYLT_LIBRARY_H