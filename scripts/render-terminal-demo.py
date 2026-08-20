from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont

ANSI = re.compile(r"\x1b\[([0-9;]*)m")
COLORS = {
    "0": (215, 225, 238),
    "1": (238, 247, 255),
    "2": (117, 132, 154),
    "31": (255, 111, 132),
    "32": (76, 220, 155),
    "33": (255, 203, 92),
    "34": (91, 168, 255),
    "35": (210, 126, 255),
    "36": (77, 224, 235),
    "37": (235, 244, 255),
    "90": (117, 132, 154),
    "39": (215, 225, 238),
}

WIDTH = 1680
HEIGHT = 1180
BG = (5, 11, 24)
PANEL = (10, 20, 39)
PANEL_EDGE = (31, 60, 91)
TEXT = (215, 225, 238)
MUTED = (117, 132, 154)
CYAN = (77, 224, 235)
MAGENTA = (210, 126, 255)


def load_font(path: str, size: int):
    return ImageFont.truetype(path, size=size)


def parse_ansi(line: str) -> list[tuple[str, tuple[int, int, int]]]:
    segments: list[tuple[str, tuple[int, int, int]]] = []
    current = COLORS["0"]
    cursor = 0
    for match in ANSI.finditer(line):
        text = line[cursor:match.start()]
        if text:
            segments.append((text, current))
        code = match.group(1).split(";")[-1] or "0"
        current = COLORS.get(code, current)
        cursor = match.end()
    tail = line[cursor:]
    if tail:
        segments.append((tail, current))
    return segments


def draw_gradient(draw: ImageDraw.ImageDraw) -> None:
    for x in range(WIDTH):
        ratio = x / max(WIDTH - 1, 1)
        color = (
            int(CYAN[0] * (1 - ratio) + MAGENTA[0] * ratio),
            int(CYAN[1] * (1 - ratio) + MAGENTA[1] * ratio),
            int(CYAN[2] * (1 - ratio) + MAGENTA[2] * ratio),
        )
        draw.line((x, 0, x, 8), fill=color)


def render(lines: Iterable[str], output: Path, font_path: str, visible_lines: int | None = None) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw_gradient(draw)

    panel = (70, 62, WIDTH - 70, HEIGHT - 66)
    draw.rounded_rectangle(panel, radius=24, fill=PANEL, outline=PANEL_EDGE, width=2)
    draw.rectangle((70, 62, WIDTH - 70, 136), fill=(13, 28, 52))
    draw.line((70, 136, WIDTH - 70, 136), fill=(29, 61, 91), width=2)

    for x, color in [(106, (255, 102, 126)), (134, (255, 202, 92)), (162, (76, 220, 155))]:
        draw.ellipse((x - 8, 95 - 8, x + 8, 95 + 8), fill=color)

    title_font = load_font(font_path, 22)
    mono_font = load_font(font_path, 18)
    small_font = load_font(font_path, 15)
    draw.text((210, 82), "RepoSentinel", font=title_font, fill=TEXT)
    draw.text((210, 111), "Sentinel Console  /  terminal preview", font=small_font, fill=MUTED)
    badge = "LOCAL  ·  NETWORK OFF  ·  EN / ID"
    badge_width = draw.textlength(badge, font=small_font)
    draw.rounded_rectangle((WIDTH - 96 - badge_width, 86, WIDTH - 96, 116), radius=14, fill=(17, 56, 72), outline=(47, 162, 181))
    draw.text((WIDTH - 81 - badge_width, 92), badge, font=small_font, fill=CYAN)

    y = 170
    line_height = 24
    all_lines = list(lines)
    if visible_lines is not None:
        all_lines = all_lines[:visible_lines]
    for raw in all_lines:
        x = 112
        for text, color in parse_ansi(raw.rstrip("\n")):
            draw.text((x, y), text, font=mono_font, fill=color)
            x += draw.textlength(text, font=mono_font)
        y += line_height
        if y > HEIGHT - 125:
            break

    footer_y = HEIGHT - 103
    draw.line((112, footer_y - 17, WIDTH - 112, footer_y - 17), fill=(27, 52, 80), width=1)
    draw.text((112, footer_y), "◈ scan complete", font=small_font, fill=CYAN)
    draw.text((WIDTH - 355, footer_y), "↑↓ navigate   ? help   q quit", font=small_font, fill=MUTED)
    image.save(output, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
    parser.add_argument("--frames-dir")
    args = parser.parse_args()

    lines = Path(args.input).read_text(encoding="utf-8").splitlines()
    render(lines, Path(args.output), args.font)
    if args.frames_dir:
        frames_dir = Path(args.frames_dir)
        frames_dir.mkdir(parents=True, exist_ok=True)
        total = len(lines)
        for index in range(1, total + 1):
            render(lines, frames_dir / f"frame-{index:04d}.png", args.font, visible_lines=index)


if __name__ == "__main__":
    main()
