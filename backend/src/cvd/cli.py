"""
CLI entry point: `cvd-pipeline` (or `python -m cvd.cli`).

Run modes, cheapest first:
  --no-llm            qualify only, no enrichment/scoring (works with zero
                       API keys — good for the Airtable-read-first slice)
  (default)            qualify + enrich + score with the configured LLM
"""

from __future__ import annotations

import argparse
import logging
import sys

from .config import settings
from .llm.groq import GroqClient
from .pipeline import run
from .sources.manual import ManualJsonSource


def build_sources(args: argparse.Namespace) -> list:
    sources = []
    if args.local_file:
        sources.append(ManualJsonSource(args.local_file))
    if args.airtable:
        from .sources.airtable_source import AirtableSource

        # Reads the SITUATIONS/PIPELINE table (see AirtableSource.PIPELINE_TABLE);
        # settings.airtable_table_name is a different table, used only by the
        # write-back sink.
        sources.append(AirtableSource(settings.airtable_api_key, settings.airtable_base_id))
    if not sources:
        raise SystemExit("No source configured. Pass --local-file or --airtable.")
    return sources


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="CVD 2.0 sourcing & screening pipeline")
    parser.add_argument("--local-file", help="Path to a JSON file of raw submissions (dev/test)")
    parser.add_argument("--airtable", action="store_true", help="Also pull from Airtable")
    parser.add_argument("--no-llm", action="store_true", help="Qualify only, skip enrichment/scoring")
    parser.add_argument("--state", default="./data/state.json")
    args = parser.parse_args(argv)

    sources = build_sources(args)

    llm = scoring_llm = None
    if not args.no_llm:
        llm = GroqClient(settings.groq_api_key, model=settings.groq_model)
        scoring_llm = GroqClient(settings.groq_api_key, model=settings.groq_scoring_model)

    result = run(sources, llm, scoring_llm, settings, state_path=args.state)

    print(  # noqa: T201
        f"processed={result.processed} qualified={result.qualified} "
        f"rejected={result.rejected} errors={len(result.errors)}"
    )
    for e in result.errors:
        print(f"  ERROR: {e}")  # noqa: T201

    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
