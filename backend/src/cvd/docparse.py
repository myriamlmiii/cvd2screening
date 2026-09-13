"""
Deck -> text.

v1: PyMuPDF text-layer extraction. This gets you 60-80% of decks that were
exported from Figma/Keynote/Pitch.com with a real text layer. It will
return close to nothing for image-heavy or scanned decks.

Upgrade path, in order, when that starts costing real deals:
  1. Swap in `marker` or `docling` for layout-aware PDF -> markdown
     (both handle tables and OCR fallback far better than raw PyMuPDF).
  2. For decks that still come back empty, render pages to images and send
     them to a multimodal model instead of bolting
     on Tesseract — this is more robust for decks that are basically
     screenshots of slides.
Neither is wired up here; this module is the single seam where either
plugs in without touching the rest of the pipeline.
"""

from __future__ import annotations

from pathlib import Path


def extract_text(path: str | Path) -> str:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    try:
        import fitz  # PyMuPDF
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "PyMuPDF not installed. Install the 'docs' extra: "
            "pip install -e '.[docs]'"
        ) from exc

    text_parts: list[str] = []
    with fitz.open(path) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts).strip()


def looks_empty(text: str, min_chars: int = 200) -> bool:
    """Heuristic: a deck whose extracted text is this short is almost
    certainly image-heavy and needs the multimodal fallback, not more
    regex."""
    return len(text.strip()) < min_chars
