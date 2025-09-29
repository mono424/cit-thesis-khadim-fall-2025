#include <iostream>
#include "library.h"
#include <Eigen/Core>


static bool transformation_project_internal(
    const IntrinsicParameters& calib, const Eigen::Vector2f& xy,
    Eigen::Vector2f& uv, int* valid, Eigen::Vector4f& J_xy) {
    float cx = calib.c_x;
    float cy = calib.c_y;
    float fx = calib.fov_x;
    float fy = calib.fov_y;
    float k1 = calib.radial_distortion[0];
    float k2 = calib.radial_distortion[1];
    float k3 = calib.radial_distortion[2];
    float k4 = calib.radial_distortion[3];
    float k5 = calib.radial_distortion[4];
    float k6 = calib.radial_distortion[5];
    float codx = 0.f;  // center of distortion is set to 0 for Brown Conrady model
    float cody = 0.f;
    float p1 = calib.tangential_distortion[0];
    float p2 = calib.tangential_distortion[1];
    float max_radius_for_projection = 1.7f;  // default value corresponds to ~120 degree FoV

    if (!(fx > 0.f && fy > 0.f)) {
        std::cerr << "Expect both fx and fy are larger than 0, actual values are fx:" << fx << ", fy: " << fy <<
            " for coordinate: (" << xy(0) << "," << xy(1) << ")" << std::endl;
        return false;
    }

    *valid = 1;

    float xp = xy(0) - codx;
    float yp = xy(1) - cody;

    float xp2 = xp * xp;
    float yp2 = yp * yp;
    float xyp = xp * yp;
    float rs = xp2 + yp2;
    if (rs > max_radius_for_projection * max_radius_for_projection) {
        *valid = 0;
        return true;
    }
    float rss = rs * rs;
    float rsc = rss * rs;
    float a = 1.f + k1 * rs + k2 * rss + k3 * rsc;
    float b = 1.f + k4 * rs + k5 * rss + k6 * rsc;
    float bi;
    if (b != 0.f) {
        bi = 1.f / b;
    } else {
        bi = 1.f;
    }
    float d = a * bi;

    float xp_d = xp * d;
    float yp_d = yp * d;

    float rs_2xp2 = rs + 2.f * xp2;
    float rs_2yp2 = rs + 2.f * yp2;

    xp_d += rs_2xp2 * p2 + 2.f * xyp * p1;
    yp_d += rs_2yp2 * p1 + 2.f * xyp * p2;

    float xp_d_cx = xp_d + codx;
    float yp_d_cy = yp_d + cody;

    uv(0) = xp_d_cx * fx + cx;
    uv(1) = yp_d_cy * fy + cy;

    // compute Jacobian matrix
    float dudrs = k1 + 2.f * k2 * rs + 3.f * k3 * rss;
    // compute d(b)/d(r^2)
    float dvdrs = k4 + 2.f * k5 * rs + 3.f * k6 * rss;
    float bis = bi * bi;
    float dddrs = (dudrs * b - a * dvdrs) * bis;

    float dddrs_2 = dddrs * 2.f;
    float xp_dddrs_2 = xp * dddrs_2;
    float yp_xp_dddrs_2 = yp * xp_dddrs_2;

    // compute d(u)/d(xp)
    J_xy(0) = fx * (d + xp * xp_dddrs_2 + 6.f * xp * p2 + 2.f * yp * p1);
    J_xy(1) = fx * (yp_xp_dddrs_2 + 2.f * yp * p2 + 2.f * xp * p1);
    J_xy(2) = fy * (yp_xp_dddrs_2 + 2.f * xp * p1 + 2.f * yp * p2);
    J_xy(3) = fy * (d + yp * yp * dddrs_2 + 6.f * yp * p1 + 2.f * xp * p2);

    return true;
}

static void invert_2x2(const Eigen::Vector4f& J, Eigen::Vector4f& Jinv) {
    float detJ = J(0) * J(3) - J(1) * J(2);
    float inv_detJ = 1.f / detJ;

    Jinv(0) = inv_detJ * J(3);
    Jinv(3) = inv_detJ * J(0);
    Jinv(1) = -inv_detJ * J(1);
    Jinv(2) = -inv_detJ * J(2);
}

static bool transformation_iterative_unproject(
    const IntrinsicParameters& calib, const Eigen::Vector2f& uv,
    Eigen::Vector2f& xy, int* valid, unsigned int max_passes) {
    *valid = 1;
    Eigen::Vector4f Jinv;
    Eigen::Vector2f best_xy{0.f, 0.f};
    float best_err = std::numeric_limits<float>::max();

    for (unsigned int pass = 0; pass < max_passes; pass++) {
        Eigen::Vector2f p;
        Eigen::Vector4f J;

        if (!(transformation_project_internal(calib, xy, p, valid, J))) {
            return false;
        }
        if (*valid == 0) {
            return true;
        }

        float err_x = uv(0) - p(0);
        float err_y = uv(1) - p(1);
        float err = err_x * err_x + err_y * err_y;
        if (err >= best_err) {
            xy(0) = best_xy(0);
            xy(1) = best_xy(1);
            break;
        }

        best_err = err;
        best_xy(0) = xy(0);
        best_xy(1) = xy(1);
        invert_2x2(J, Jinv);
        if (pass + 1 == max_passes || best_err < 1e-22f) {
            break;
        }

        float dx = Jinv(0) * err_x + Jinv(1) * err_y;
        float dy = Jinv(2) * err_x + Jinv(3) * err_y;

        xy(0) += dx;
        xy(1) += dy;
    }

    if (best_err > 1e-6f) {
        *valid = 0;
    }

    return true;
}

static bool transformation_unproject_internal(
    const IntrinsicParameters& calib, const Eigen::Vector2f& uv,
    Eigen::Vector2f& xy, int* valid) {
    float cx = calib.c_x;
    float cy = calib.c_y;
    float fx = calib.fov_x;
    float fy = calib.fov_y;
    float k1 = calib.radial_distortion[0];
    float k2 = calib.radial_distortion[1];
    float k3 = calib.radial_distortion[2];
    float k4 = calib.radial_distortion[3];
    float k5 = calib.radial_distortion[4];
    float k6 = calib.radial_distortion[5];
    float codx =
        0.f;  // center of distortion is set to 0 for Brown Conrady model
    float cody = 0.f;
    float p1 = calib.tangential_distortion[0];
    float p2 = calib.tangential_distortion[1];

    if (!(fx > 0.f && fy > 0.f)) {
        std::cerr << "XYLookupTable: Expect both fx and fy are larger than 0, actual values are fx:" << static_cast<double>(fx)
            << ", fy: " << static_cast<double>(fy) << " for coordinate: (" << xy(0) << "," << xy(1) << ")" << std::endl;
        return false;
    }

    // correction for radial distortion
    float xp_d = (uv(0) - cx) / fx - codx;
    float yp_d = (uv(1) - cy) / fy - cody;

    float rs = xp_d * xp_d + yp_d * yp_d;
    float rss = rs * rs;
    float rsc = rss * rs;
    float a = 1.f + k1 * rs + k2 * rss + k3 * rsc;
    float b = 1.f + k4 * rs + k5 * rss + k6 * rsc;
    float ai;
    if (a != 0.f) {
        ai = 1.f / a;
    } else {
        ai = 1.f;
    }
    float di = ai * b;

    xy(0) = xp_d * di;
    xy(1) = yp_d * di;

    // approximate correction for tangential params
    float two_xy = 2.f * xy(0) * xy(1);
    float xx = xy(0) * xy(0);
    float yy = xy(1) * xy(1);

    xy(0) -= (yy + 3.f * xx) * p2 + two_xy * p1;
    xy(1) -= (xx + 3.f * xx) * p1 + two_xy * p2;

    // add on center of distortion
    xy(0) += codx;
    xy(1) += cody;

    return transformation_iterative_unproject(calib, uv, xy, valid, 20);
}

bool transformation_unproject(const IntrinsicParameters& calib,
                              const Eigen::Vector2f& point2d, const float depth,
                              Eigen::Vector3f& point3d, int* valid) {
    if (depth == 0.f) {
        point3d(0) = 0.f;
        point3d(1) = 0.f;
        point3d(2) = 0.f;
        *valid = 0;
        return true;
    }

    Eigen::Vector2f xy{point3d(0), point3d(1)};
    if (!transformation_unproject_internal(calib, point2d, xy, valid)) {
        return false;
    }

    point3d(0) = xy(0) * depth;
    point3d(1) = xy(1) * depth;
    point3d(2) = depth;

    return true;
}

bool transformation_project(const IntrinsicParameters& calib,
                            const Eigen::Vector3f& point3d,
                            Eigen::Vector2f& point2d, int* valid) {
    if (point3d(2) <= 0.f) {
        point2d(0) = 0.f;
        point2d(1) = 0.f;
        *valid = 0;
        return true;
    }

    Eigen::Vector2f xy;
    xy(0) = point3d(0) / point3d(2);
    xy(1) = point3d(1) / point3d(2);

    Eigen::Vector4f _J;  // unused
    return transformation_project_internal(calib, xy, point2d, valid, _J);
}

bool create_xy_lookup_table(const IntrinsicParameters& calib,
                            std::shared_ptr<XYTableData>& xy_table) {
    if (!(calib.fov_x > 0.f && calib.fov_y > 0.f)) {
        std::cerr << "XYLookupTable: Expect both fx and fy are larger than 0, actual values are fx:" << static_cast<double>(
            calib.fov_x) << ", fy: " << static_cast<double>(calib.fov_y) << std::endl;
        return false;
    }

    unsigned int width = calib.width;
    unsigned int height = calib.height;

    xy_table = std::make_shared<XYTableData>();
    xy_table->width = width;
    xy_table->height = height;
    xy_table->data.resize(width * height * 2);

    Eigen::Vector2f p;
    Eigen::Vector3f ray;
    int valid;

    // precompute xy lookup table (Vec3(x,y,1) are vectors pointing to the image plane at distance 1 unit)
    for (int y = 0, idx = 0; y < height; y++)
    {
        p(1) = static_cast<float>(y);
        for (int x = 0; x < width; x++, idx++)
        {
            p(0) = static_cast<float>(x);
            size_t vector_idx = 2 * (y * width + x);

            if (transformation_unproject(calib, p, 1.f, ray, &valid))
            {
                if (valid)
                {
                    xy_table->data[vector_idx] = ray(0);
                    xy_table->data[vector_idx + 1] = ray(1);
                }
                else
                {
                    xy_table->data[vector_idx] = 0.f;
                    xy_table->data[vector_idx + 1] = 0.f;
                    std::cout << "XYLookupTable: Invalid point: " << x << ", " << y << std::endl;
                }
            } else {
                std::cout << "XYLookupTable: No result for: " << x << ", " << y << std::endl;
            }
        }
    }
    return true;
}
