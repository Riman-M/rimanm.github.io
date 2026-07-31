#!/usr/bin/env python3
"""
Update data/metrics.json with live figures from Google Scholar.

Reads the Scholar author ID from data/profile.json, fetches citation count,
h-index and i10-index, and writes them into data/metrics.json — leaving every
other field (publications, patents, etc.) untouched.

Designed to fail SAFE: if Scholar can't be reached or blocks the request, the
script prints a message and exits 0 without changing anything, so the site
keeps showing the last known-good numbers.

Two backends:
  * scholarly            — free, no key, but Google may block datacenter IPs
  * SerpAPI (optional)   — set the SERPAPI_KEY env var for a reliable path
                           (free tier: 100 searches/month)
"""
import json, os, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROFILE = ROOT / "data" / "profile.json"
METRICS = ROOT / "data" / "metrics.json"


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def fetch_serpapi(author_id, key):
    from serpapi import GoogleSearch  # google-search-results
    s = GoogleSearch({"engine": "google_scholar_author",
                      "author_id": author_id, "api_key": key})
    a = s.get_dict().get("cited_by", {}).get("table", [])
    out = {}
    for row in a:
        if "citations" in row:
            out["citations"] = int(row["citations"]["all"])
        if "h_index" in row:
            out["hIndex"] = int(row["h_index"]["all"])
        if "i10_index" in row:
            out["i10Index"] = int(row["i10_index"]["all"])
    return out


def fetch_scholarly(author_id):
    from scholarly import scholarly
    a = scholarly.search_author_id(author_id)
    a = scholarly.fill(a, sections=["indices"])
    return {
        "citations": int(a.get("citedby", 0)),
        "hIndex": int(a.get("hindex", 0)),
        "i10Index": int(a.get("i10index", 0)),
    }


def main():
    profile = load(PROFILE)
    author_id = profile.get("scholarAuthorId")
    if not author_id:
        print("No scholarAuthorId in profile.json; nothing to do.")
        return 0

    key = os.environ.get("SERPAPI_KEY")
    try:
        new = fetch_serpapi(author_id, key) if key else fetch_scholarly(author_id)
    except Exception as e:
        print(f"Scholar fetch failed ({e}); leaving metrics unchanged.")
        return 0

    if not new.get("citations"):
        print("Fetch returned no citation count; leaving metrics unchanged.")
        return 0

    metrics = load(METRICS)
    changed = False
    for k in ("citations", "hIndex", "i10Index"):
        if k in new and new[k] and metrics.get(k) != new[k]:
            print(f"{k}: {metrics.get(k)} -> {new[k]}")
            metrics[k] = new[k]
            changed = True

    if not changed:
        print("Metrics already current; no change.")
        return 0

    import datetime
    metrics["updated"] = datetime.date.today().strftime("%Y-%m")
    with open(METRICS, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("metrics.json updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
