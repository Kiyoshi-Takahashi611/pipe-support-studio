"""実行に必要な2ファイルのみをパッケージする（テスト・認証情報は含めない）。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
(root/'build').mkdir(exist_ok=True)
with ZipFile(root/'build/access.zip','w',ZIP_DEFLATED) as archive:
    for name in ('index.py','membership.py'):
        archive.write(root/'server'/name,name)
print('build/access.zip')
