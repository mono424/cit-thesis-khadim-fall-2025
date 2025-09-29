from setuptools import setup, Extension
from glob import glob

path_Zdepth = './3rdparty/Zdepth'
path_zstd   = './3rdparty/Zdepth/zstd'

Zdepth_cpp_sources = glob(f'{path_Zdepth}/src/*.cpp')
Zdepth_c_sources   = glob(f'{path_Zdepth}/src/*.c')
zstd_c_sources     = glob(f'{path_zstd}/src/*.c')

sources = Zdepth_cpp_sources + Zdepth_c_sources + zstd_c_sources + ['./pyzdepth.cpp']

ext = Extension(
    name='pyzdepth',
    sources=sources,
    language='c++',
    include_dirs=[
        f'{path_Zdepth}/include',
        f'{path_zstd}/lib',
        f'{path_zstd}/lib/common',
        f'{path_zstd}/include',
        f'{path_zstd}/src'
    ]
)

setup(ext_modules=[ext])