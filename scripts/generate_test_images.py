from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-assets"


def make_canvas(kind: str, index: int) -> Image.Image:
    img = Image.new("RGB", (128, 128), (245, 248, 252))
    draw = ImageDraw.Draw(img)
    if kind == "class-a":
        draw.ellipse((30, 30, 98, 98), fill=(224, 56, 76), outline=(160, 18, 42), width=4)
        draw.rectangle((18, 18, 44, 44), fill=(252, 226, 229))
    else:
        draw.polygon([(64, 24), (104, 100), (24, 100)], fill=(52, 112, 232), outline=(16, 61, 164))
        draw.rectangle((18, 18, 36, 36), fill=(232, 240, 255))

    draw.text((10, 108), f"{kind[-1].upper()}{index}", fill=(55, 65, 81))
    return img


def main() -> None:
    for folder in [OUT / "class-a", OUT / "class-b"]:
        folder.mkdir(parents=True, exist_ok=True)

    for index in range(1, 5):
        make_canvas("class-a", index).save(OUT / "class-a" / f"a_{index:02d}.png")
        make_canvas("class-b", index).save(OUT / "class-b" / f"b_{index:02d}.png")

    print(f"generated under {OUT}")


if __name__ == "__main__":
    main()
