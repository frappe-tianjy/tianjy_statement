from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in tianjy_statement/__init__.py
from tianjy_statement import __version__ as version

setup(
	name="tianjy_statement",
	version=version,
	description="天玑报表 Tianjy Statement",
	author="天玑 Tianjy",
	author_email="Tianjy",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
