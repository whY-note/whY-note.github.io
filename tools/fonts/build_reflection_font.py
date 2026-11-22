"""Create the locally hosted Reflection font from the official variable TTF.

Requires: pip install 'fonttools[woff]'
Usage: python tools/fonts/build_reflection_font.py /path/to/NotoSerifSC-variable.ttf
"""
import argparse
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
args = parser.parse_args()

# GB2312 covers common simplified Chinese, rather than only today's page title.
characters = set(chr(code) for code in range(0x20, 0x100))
for lead in range(0xA1, 0xF8):
    for trail in range(0xA1, 0xFF):
        try:
            characters.update(bytes((lead, trail)).decode("gb2312"))
        except UnicodeDecodeError:
            pass
characters.update(chr(code) for code in range(0x2000, 0x2070))
characters.update(chr(code) for code in range(0x3000, 0x3040))
page_text = (ROOT/"life/reflection/index.html").read_text()
characters.update(page_text)
for path in (ROOT/"_life").glob("*.md"):
    text = path.read_text()
    if text.startswith("---\n"):
        characters.update(text.split("---", 2)[1])

font = TTFont(args.source)
available = font.getBestCmap()
required = {ord(char) for char in characters if ord(char) in available}
options = subset.Options()
options.layout_features = ["*"]
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=required)
subsetter.subset(font)
instantiateVariableFont(font, {"wght": (400, 500)}, inplace=True)
font.flavor = "woff2"
output = ROOT/"assets/fonts/noto-serif-sc/noto-serif-sc-400-500.woff2"
output.parent.mkdir(parents=True, exist_ok=True)
font.save(output)
check = TTFont(output)
assert required <= set(check.getBestCmap())
axis = next(axis for axis in check["fvar"].axes if axis.axisTag == "wght")
assert (axis.minValue, axis.maxValue) == (400, 500)
print(f"Saved {output.relative_to(ROOT)}: {output.stat().st_size/1024:.0f} KB, {len(required)} characters, weights 400–500")
