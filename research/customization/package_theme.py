from pathlib import Path
from package_qpro import package
ROOT=Path(__file__).resolve().parents[2]
package(ROOT/'frontend/IIDXLab-static.zip',ROOT/'frontend/dist',[(ROOT/'frontend/README.md','README.md'),(ROOT/'research/customization/THEME-EXPORT.md','THEME-EXPORT.md')])
package(ROOT/'theme-data/Theme-assets.zip',ROOT/'theme-data/web',[(ROOT/'research/customization/THEME-EXPORT.md','THEME-EXPORT.md')])
