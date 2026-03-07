#!/usr/bin/env python3
"""
Batak Tournament — Logo Generator
Generates all app icons for mobile (Expo) and web (PWA).

Design: Casino card with green felt background, gold border, spade symbol.
"""

import os
import struct
import zlib
from PIL import Image, ImageDraw, ImageFont

# ── Design tokens ────────────────────────────────────────────────────────────
BG_GREEN     = (13, 40, 24, 255)       # #0d2818 felt dark
CARD_WHITE   = (255, 252, 245, 255)    # warm white card
GOLD         = (212, 175, 55, 255)     # #d4af37 gold
SPADE_BLACK  = (15, 10, 10, 255)       # near-black spade

FONT_PATH    = "/System/Library/Fonts/Apple Symbols.ttf"
FONT_PATH_HV = "/System/Library/Fonts/Helvetica.ttc"

# ── Corner suit layout: (symbol, color) ──────────────────────────────────────
CORNERS = [
    ("\u2665", (220, 50, 50, 255)),    # ♥ top-left  red
    ("\u2666", (220, 50, 50, 255)),    # ♦ top-right red
    ("\u2663", GOLD),                  # ♣ bottom-left gold
    ("\u2660", GOLD),                  # ♠ bottom-right gold
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def draw_rounded_rect(draw, bbox, radius, fill, outline, outline_width):
    """Draw a filled rounded rectangle with an outline."""
    x0, y0, x1, y1 = bbox
    # Fill
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)
    # Outline (simulate thick border by drawing concentric rounded rects)
    for i in range(outline_width):
        draw.rounded_rectangle(
            [x0 + i, y0 + i, x1 - i, y1 - i],
            radius=max(radius - i, 1),
            outline=outline,
        )


def draw_batak_logo(
    size: int,
    transparent_bg: bool = False,
    adaptive: bool = False,
) -> Image.Image:
    """
    Draw the Batak logo at the given square size.

    transparent_bg — if True, background is transparent (splash / adaptive)
    adaptive       — if True, shrink card into Android safe zone (66%)
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Background ───────────────────────────────────────────────────────────
    if not transparent_bg:
        draw.rectangle([0, 0, size, size], fill=BG_GREEN)

    # ── Card geometry ────────────────────────────────────────────────────────
    # For adaptive icons, keep card within the 66% safe zone
    scale = 0.55 if adaptive else 0.60
    card_w = int(size * scale)
    # Poker card aspect ratio ≈ 5∶7
    card_h = int(card_w * 7 / 5)
    # Cap height so card fits vertically
    if card_h > int(size * 0.84):
        card_h = int(size * 0.84)
        card_w = int(card_h * 5 / 7)

    card_x = (size - card_w) // 2
    card_y = (size - card_h) // 2
    radius  = max(int(card_w * 0.08), 4)
    border  = max(int(size * 0.009), 2)

    draw_rounded_rect(
        draw,
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius,
        CARD_WHITE,
        GOLD,
        border,
    )

    # ── Center spade ─────────────────────────────────────────────────────────
    center_font_size = max(int(card_w * 0.52), 8)
    try:
        center_font = load_font(center_font_size)
    except OSError:
        center_font = ImageFont.load_default()

    spade_char = "\u2660"
    bbox = draw.textbbox((0, 0), spade_char, font=center_font)
    sw, sh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    sx = card_x + (card_w - sw) // 2 - bbox[0]
    sy = card_y + (card_h - sh) // 2 - bbox[1]
    draw.text((sx, sy), spade_char, font=center_font, fill=SPADE_BLACK)

    # ── Corner suit symbols ───────────────────────────────────────────────────
    corner_font_size = max(int(card_w * 0.145), 6)
    try:
        corner_font = load_font(corner_font_size)
    except OSError:
        corner_font = ImageFont.load_default()

    padding = max(int(card_w * 0.09), 4)
    # (symbol, color, anchor_x, anchor_y, text_align)
    corner_positions = [
        (CORNERS[0], card_x + padding,            card_y + padding),             # top-left
        (CORNERS[1], card_x + card_w - padding,   card_y + padding),             # top-right
        (CORNERS[2], card_x + padding,            card_y + card_h - padding),    # bottom-left
        (CORNERS[3], card_x + card_w - padding,   card_y + card_h - padding),    # bottom-right
    ]

    for i, ((symbol, color), cx, cy) in enumerate(corner_positions):
        cbbox = draw.textbbox((0, 0), symbol, font=corner_font)
        cw = cbbox[2] - cbbox[0]
        ch = cbbox[3] - cbbox[1]
        # Adjust so the symbol is anchored at corner
        if i in (1, 3):   # right-side corners
            tx = cx - cw - cbbox[0]
        else:
            tx = cx - cbbox[0]
        if i in (2, 3):   # bottom corners
            ty = cy - ch - cbbox[1]
        else:
            ty = cy - cbbox[1]
        draw.text((tx, ty), symbol, font=corner_font, fill=color)

    return img


def make_ico(sizes=(16, 32, 48)):
    """Create a multi-size .ico file from PIL images."""
    images = []
    for s in sizes:
        img = draw_batak_logo(s, transparent_bg=False)
        images.append(img.convert("RGBA"))
    return images


def save_ico(images, path):
    """
    Write a minimal multi-size ICO file.
    PIL's built-in ico writer supports single image; we build multi-size manually.
    """
    # Use PIL's save with sizes parameter (Pillow ≥ 9.1 supports sizes kwarg)
    base = images[-1]  # largest
    base.save(path, format="ICO", sizes=[(img.width, img.height) for img in images])
    print(f"  saved {path}")


def generate_all():
    base = "/Users/mesahin/batak"
    mobile_assets = os.path.join(base, "mobile", "assets")
    web_images    = os.path.join(base, "client", "public", "images")
    web_public    = os.path.join(base, "client", "public")

    os.makedirs(mobile_assets, exist_ok=True)
    os.makedirs(web_images,    exist_ok=True)

    # ── Mobile assets ────────────────────────────────────────────────────────
    print("Generating mobile assets...")

    # icon.png — full design with background, 1024×1024
    img = draw_batak_logo(1024, transparent_bg=False, adaptive=False)
    img.save(os.path.join(mobile_assets, "icon.png"))
    print("  saved mobile/assets/icon.png")

    # adaptive-icon.png — transparent bg, card in safe zone, 1024×1024
    img = draw_batak_logo(1024, transparent_bg=True, adaptive=True)
    img.save(os.path.join(mobile_assets, "adaptive-icon.png"))
    print("  saved mobile/assets/adaptive-icon.png")

    # splash-icon.png — transparent bg, standard card, 1024×1024
    img = draw_batak_logo(1024, transparent_bg=True, adaptive=False)
    img.save(os.path.join(mobile_assets, "splash-icon.png"))
    print("  saved mobile/assets/splash-icon.png")

    # favicon.png — full design, 196×196
    img = draw_batak_logo(196, transparent_bg=False, adaptive=False)
    img.save(os.path.join(mobile_assets, "favicon.png"))
    print("  saved mobile/assets/favicon.png")

    # ── Web PWA icons ────────────────────────────────────────────────────────
    print("Generating web PWA icons...")

    web_sizes = [512, 384, 192, 152, 144, 128, 96, 72]
    for s in web_sizes:
        img = draw_batak_logo(s, transparent_bg=False, adaptive=False)
        out = os.path.join(web_images, f"icon-{s}x{s}.png")
        img.save(out)
        print(f"  saved {out}")

    # Maskable icons (safe-zone aware)
    for s in (512, 192):
        img = draw_batak_logo(s, transparent_bg=False, adaptive=True)
        out = os.path.join(web_images, f"icon-maskable-{s}x{s}.png")
        img.save(out)
        print(f"  saved {out}")

    # Favicon sizes
    for s in (48, 32, 16):
        img = draw_batak_logo(s, transparent_bg=False, adaptive=False)
        out = os.path.join(web_images, f"favicon-{s}x{s}.png")
        img.save(out)
        print(f"  saved {out}")

    # favicon.ico — multi-size
    print("Generating favicon.ico...")
    ico_images = [
        draw_batak_logo(16, transparent_bg=False).convert("RGBA"),
        draw_batak_logo(32, transparent_bg=False).convert("RGBA"),
        draw_batak_logo(48, transparent_bg=False).convert("RGBA"),
    ]
    ico_path = os.path.join(web_public, "favicon.ico")
    ico_images[-1].save(
        ico_path,
        format="ICO",
        sizes=[(img.width, img.height) for img in ico_images],
    )
    print(f"  saved {ico_path}")

    print("\nDone! All logo files generated.")


if __name__ == "__main__":
    generate_all()
