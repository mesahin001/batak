#!/usr/bin/env python3
"""
Batak Tournament — Logo Generator (Medallion Style)
Generates all app icons for mobile (Expo), web (PWA), and Android mipmaps.

Design: Gold medallion/coin with sunburst gear ring, dark center, gold spade,
        "BATAK" + "TOURNAMENT" text.
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

# ── Design tokens ─────────────────────────────────────────────────────────────
BG_GREEN   = (13, 40, 24, 255)    # #0d2818 feltDark casino green
GOLD       = (212, 175, 55, 255)  # #d4af37 goldPrimary
GOLD_DIM   = (168, 140, 42, 255)  # #a88c2a dimmer gold for "TOURNAMENT"
INNER_DARK = (10, 31, 16, 255)    # #0a1f10 very dark green-black (coin interior)

FONT_SYMBOL  = "/System/Library/Fonts/Apple Symbols.ttf"
FONT_BOLD    = "/System/Library/Fonts/Helvetica.ttc"
FONT_BOLD_IDX = 1  # index 1 = Helvetica Bold in the TTC collection


def load_font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size, index=index)
    except OSError:
        try:
            return ImageFont.truetype(path, size, index=0)
        except OSError:
            return ImageFont.load_default()


def draw_sunburst(
    draw: ImageDraw.ImageDraw,
    cx: float, cy: float,
    spike_r: float, valley_r: float,
    num_spikes: int,
    color: tuple,
) -> None:
    """
    Draw a sunburst / gear shape as a star polygon.
    Points alternate between spike_r (tooth tips) and valley_r (tooth bases).
    num_spikes=36 gives a 36-tooth gear, one tooth every 10 degrees.
    """
    points = []
    step = math.pi / num_spikes  # angle between adjacent spike/valley
    for i in range(num_spikes * 2):
        angle = i * step - math.pi / 2  # start from 12 o'clock
        r = spike_r if i % 2 == 0 else valley_r
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=color)


def draw_batak_logo(
    size: int,
    transparent_bg: bool = False,
    adaptive: bool = False,
) -> Image.Image:
    """
    Render the Batak medallion logo at `size` x `size` pixels.

    transparent_bg  -- True for splash / adaptive foreground layers
    adaptive        -- True to keep everything inside Android's 66% safe zone
    """
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background
    if not transparent_bg:
        draw.rectangle([0, 0, size, size], fill=BG_GREEN)

    cx = size / 2.0

    # Vertical layout: for adaptive icons the medallion is exactly centered;
    # for standard icons it sits in the upper ~60% so text fits below.
    if adaptive:
        medal_cy = size * 0.5
        scale    = 0.22   # well within 66% safe zone, no clipping
    else:
        medal_cy = size * 0.40
        scale    = 0.28

    spike_r  = size * scale          # sunburst spike tips (outermost radius)
    valley_r = spike_r * 0.818       # sunburst valleys / coin edge
    circle_r = spike_r * 0.645       # inner dark-circle radius

    # ── Gold sunburst gear ────────────────────────────────────────────────────
    draw_sunburst(draw, cx, medal_cy, spike_r, valley_r, num_spikes=36, color=GOLD)

    # ── Inner dark circle (coin face) ─────────────────────────────────────────
    draw.ellipse(
        [cx - circle_r, medal_cy - circle_r,
         cx + circle_r, medal_cy + circle_r],
        fill=INNER_DARK,
    )

    # ── Gold spade symbol ─────────────────────────────────────────────────────
    spade_fs   = max(int(circle_r * 1.12), 8)
    spade_font = load_font(FONT_SYMBOL, spade_fs)
    spade_char = "\u2660"  # spade
    try:
        sb = draw.textbbox((0, 0), spade_char, font=spade_font)
        sx = cx - (sb[2] - sb[0]) / 2 - sb[0]
        sy = medal_cy - (sb[3] - sb[1]) / 2 - sb[1]
        draw.text((sx, sy), spade_char, font=spade_font, fill=GOLD)
    except Exception:
        pass

    # ── Text (omit for adaptive icons and very small sizes) ───────────────────
    if not adaptive and size >= 64:
        text_top = medal_cy + spike_r + size * 0.022

        # "BATAK" -- bold, gold
        batak_fs   = max(int(size * 0.125), 8)
        batak_font = load_font(FONT_BOLD, batak_fs, index=FONT_BOLD_IDX)
        try:
            bb = draw.textbbox((0, 0), "BATAK", font=batak_font)
            bx = cx - (bb[2] - bb[0]) / 2 - bb[0]
            by = text_top - bb[1]
            draw.text((bx, by), "BATAK", font=batak_font, fill=GOLD)
            text_top = by + (bb[3] - bb[1]) + bb[1] + size * 0.012

            # "TOURNAMENT" -- smaller, dimmer gold, flanked by thin lines
            tourn_fs   = max(int(batak_fs * 0.46), 6)
            tourn_font = load_font(FONT_BOLD, tourn_fs, index=FONT_BOLD_IDX)
            tb  = draw.textbbox((0, 0), "TOURNAMENT", font=tourn_font)
            tw  = tb[2] - tb[0]
            th  = tb[3] - tb[1]
            tx  = cx - tw / 2 - tb[0]
            ty  = text_top - tb[1]

            # Flanking horizontal rules
            line_y   = ty + th / 2
            line_w   = max(1, int(size * 0.005))
            pad      = size * 0.025
            edge     = size * 0.045
            lx_left  = cx - tw / 2 - pad
            lx_right = cx + tw / 2 + pad
            if lx_left > edge:
                draw.line(
                    [(edge, line_y), (lx_left, line_y)],
                    fill=GOLD_DIM, width=line_w,
                )
                draw.line(
                    [(lx_right, line_y), (size - edge, line_y)],
                    fill=GOLD_DIM, width=line_w,
                )

            draw.text((tx, ty), "TOURNAMENT", font=tourn_font, fill=GOLD_DIM)
        except Exception:
            pass

    return img


def make_round(img: Image.Image) -> Image.Image:
    """Clip an image to a circle (for ic_launcher_round)."""
    size = img.width
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return out


def save_webp(img: Image.Image, path: str, size: int) -> None:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.convert("RGBA").save(path, format="WEBP", lossless=True)
    print(f"  saved {path}")


def generate_all() -> None:
    base          = "/Users/mesahin/batak"
    mobile_assets = os.path.join(base, "mobile", "assets")
    web_images    = os.path.join(base, "client", "public", "images")
    web_public    = os.path.join(base, "client", "public")
    android_res   = os.path.join(base, "mobile", "android", "app", "src", "main", "res")

    os.makedirs(mobile_assets, exist_ok=True)
    os.makedirs(web_images,    exist_ok=True)

    # ── Render source images at high resolution ───────────────────────────────
    SRC = 1024
    src_full     = draw_batak_logo(SRC, transparent_bg=False, adaptive=False)
    src_adaptive = draw_batak_logo(SRC, transparent_bg=True,  adaptive=True)
    src_splash   = draw_batak_logo(SRC, transparent_bg=True,  adaptive=False)
    # Launcher icon: centered medallion on green bg — avoids top-clip in small sizes
    src_launcher = draw_batak_logo(SRC, transparent_bg=False, adaptive=True)

    # ── Mobile assets ──────────────────────────────────────────────────────────
    print("Generating mobile assets...")

    src_full.save(os.path.join(mobile_assets, "icon.png"))
    print("  saved mobile/assets/icon.png")

    src_adaptive.save(os.path.join(mobile_assets, "adaptive-icon.png"))
    print("  saved mobile/assets/adaptive-icon.png")

    src_splash.save(os.path.join(mobile_assets, "splash-icon.png"))
    print("  saved mobile/assets/splash-icon.png")

    draw_batak_logo(196, transparent_bg=False).save(
        os.path.join(mobile_assets, "favicon.png")
    )
    print("  saved mobile/assets/favicon.png")

    # ── Web PWA icons ──────────────────────────────────────────────────────────
    print("Generating web PWA icons...")

    for s in (512, 384, 192, 152, 144, 128, 96, 72):
        out = os.path.join(web_images, f"icon-{s}x{s}.png")
        src_full.resize((s, s), Image.LANCZOS).save(out)
        print(f"  saved client/public/images/icon-{s}x{s}.png")

    # Maskable variants (adaptive foreground composited onto filled background)
    for s in (512, 192):
        fg = src_adaptive.resize((s, s), Image.LANCZOS)
        bg = Image.new("RGBA", (s, s), BG_GREEN)
        bg.paste(fg, mask=fg.split()[3])
        bg.save(os.path.join(web_images, f"icon-maskable-{s}x{s}.png"))
        print(f"  saved client/public/images/icon-maskable-{s}x{s}.png")

    for s in (48, 32, 16):
        out = os.path.join(web_images, f"favicon-{s}x{s}.png")
        src_full.resize((s, s), Image.LANCZOS).save(out)
        print(f"  saved client/public/images/favicon-{s}x{s}.png")

    # favicon.ico
    print("Generating favicon.ico...")
    ico_imgs = [src_full.resize((s, s), Image.LANCZOS).convert("RGBA")
                for s in (16, 32, 48)]
    ico_imgs[-1].save(
        os.path.join(web_public, "favicon.ico"),
        format="ICO",
        sizes=[(img.width, img.height) for img in ico_imgs],
    )
    print("  saved client/public/favicon.ico")

    # ── Android mipmap WebP ────────────────────────────────────────────────────
    # ic_launcher / ic_launcher_round: standard sized icon (dp -> px per density)
    # ic_launcher_foreground: adaptive foreground at 108dp bounding box
    DENSITIES = {
        "mdpi":    {"launcher": 48,  "foreground": 108},
        "hdpi":    {"launcher": 72,  "foreground": 162},
        "xhdpi":   {"launcher": 96,  "foreground": 216},
        "xxhdpi":  {"launcher": 144, "foreground": 324},
        "xxxhdpi": {"launcher": 192, "foreground": 432},
    }

    print("Generating Android mipmap WebP files...")
    for density, sizes in DENSITIES.items():
        mipmap_dir = os.path.join(android_res, f"mipmap-{density}")
        os.makedirs(mipmap_dir, exist_ok=True)

        ls = sizes["launcher"]
        launcher_img = src_launcher.resize((ls, ls), Image.LANCZOS)
        save_webp(launcher_img,
                  os.path.join(mipmap_dir, "ic_launcher.webp"), ls)
        save_webp(make_round(launcher_img),
                  os.path.join(mipmap_dir, "ic_launcher_round.webp"), ls)

        fs = sizes["foreground"]
        fg = src_adaptive.resize((fs, fs), Image.LANCZOS)
        save_webp(fg, os.path.join(mipmap_dir, "ic_launcher_foreground.webp"), fs)

    print("\nDone! All logo files generated.")


if __name__ == "__main__":
    generate_all()
