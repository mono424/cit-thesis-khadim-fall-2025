from setuptools import setup, find_packages

setup(
    name="pyxylt",
    version="1.0.0",
    description="XYLT Python package for thesis project",
    packages=find_packages(),
    package_data={
        'xylt': ['*.so', '*.pyd', '*.dll', '*.dylib', 'pyxylt.cpython-*-darwin.so']
    },
    include_package_data=True,
    python_requires=">=3.8",
)