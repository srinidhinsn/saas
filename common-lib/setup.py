from setuptools import setup, find_packages

setup(
    name = "common_lib",
    version = "0.1",
    author = "Srinidhi Nagarajan",
    author_email = "srinidhinsn@gmail.com",
    description = ("Packaging all common functionalities"),
    license = "BSD",
    keywords = "Saas application",
    url = "",
    #packages=['database', 'models', 'utils', 'config', 'entity'],
    packages = find_packages(),
    classifiers=[
        "Development Status :: Initial version",
        "Topic :: Common library",
        "License :: OSI Approved :: BSD License",
    ],
)