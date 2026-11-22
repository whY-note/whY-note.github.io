# Noto Serif SC for Reflection

Locally hosted WOFF2 variable font, retaining weights 400–500. Includes GB2312
Chinese, Latin, common punctuation, and characters in the Reflection index and
current Life article front matter. System serif fallbacks remain for other glyphs.

Upstream font (Noto CJK commit `985fa52c81c1d6692ccdd82bc3656e8fb932fd89`):
https://github.com/notofonts/noto-cjk/blob/985fa52c81c1d6692ccdd82bc3656e8fb932fd89/google-fonts/NotoSerifSC%5Bwght%5D.ttf

License: SIL Open Font License 1.1; see `OFL.txt`, distributed with the font.
Official license source: https://github.com/google/fonts/blob/main/ofl/notoserifsc/OFL.txt

To regenerate after adding titles with uncommon characters, install
`fonttools[woff]` in a temporary Python environment and run:

```sh
python tools/fonts/build_reflection_font.py /path/to/NotoSerifSC-variable.ttf
```
