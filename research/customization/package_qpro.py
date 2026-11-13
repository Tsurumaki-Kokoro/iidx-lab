"""Package the standalone application and reusable Qpro web assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZIP_STORED

ROOT = Path(__file__).resolve().parents[2]


def package(target, source, extras):
    files = sorted(p for p in source.rglob('*') if p.is_file())
    with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for path in files:
            archive.write(path, path.relative_to(source).as_posix(),
                          compress_type=ZIP_STORED if path.suffix == '.gz' else ZIP_DEFLATED)
        for path, name in extras:
            archive.write(path, name)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert 'qpro/catalog.json' in archive.namelist() or 'catalog.json' in archive.namelist()
    print(f'{target}: {target.stat().st_size:,} bytes, verified')


if __name__ == '__main__':
    package(ROOT / 'frontend/IIDXLab-static.zip', ROOT / 'frontend/dist',
            [(ROOT / 'frontend/README.md', 'README.md')])
    package(ROOT / 'qpro-data/Qpro-assets.zip', ROOT / 'qpro-data/web',
            [(ROOT / 'research/customization/QPRO-EXPORT.md', 'QPRO-EXPORT.md')])
