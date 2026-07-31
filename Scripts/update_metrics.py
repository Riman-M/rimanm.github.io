#!/usr/bin/env python3
"""
Refresh research metrics from multiple providers and write them into
data/metrics.json.

Providers
---------
  Google Scholar : citations, h-index, i10-index
                   via `scholarly` (no key) or SerpAPI (SERPAPI_KEY, reliable)
  Scopus         : citations, h-index, document count
                   via Elsevier Author Retrieval API (SCOPUS_API_KEY required)
  ORCiD          : number of registered works (public API, no key needed)

Design notes
------------
Every provider is independent and FAILS SAFE. If one is unreachable, blocked,
or unconfigured, the script logs it, leaves that provider's previous figures
untouched, and carries on with the others. The site therefore never shows a
blank or zeroed metric because an API had a bad day.

The headline numbers shown on the homepage come from whichever provider is
named in metrics.json -> "primarySource" (default: scholar). Per-provider
figures are kept under "sources" so the site can show them side by side.
"""
import datetime
import json
import os
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROFILE = ROOT / "data" / "profile.json"
METRICS = ROOT / "data" / "metrics.json"
TODAY = datetime.date.today().strftime("%Y-%m")


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def log(msg):
    print(msg, flush=True)


# --------------------------------------------------------------------------
# Google Scholar
# --------------------------------------------------------------------------
def fetch_scholar(author_id):
    if not author_id:
        return None, "no scholarAuthorId configured"

    key = os.environ.get("SERPAPI_KEY")
    if key:
        try:
            from serpapi import GoogleSearch
            data = GoogleSearch({
                "engine": "google_scholar_author",
                "author_id": author_id,
                "api_key": key,
            }).get_dict()
            out = {}
            for row in data.get("cited_by", {}).get("table", []):
                if "citations" in row:
                    out["citations"] = int(row["citations"]["all"])
                if "h_index" in row:
                    out["hIndex"] = int(row["h_index"]["all"])
                if "i10_index" in row:
                    out["i10Index"] = int(row["i10_index"]["all"])
            out["documents"] = len(data.get("articles", [])) or None
            return (out, None) if out.get("citations") else (None, "SerpAPI returned no figures")
        except Exception as exc:
            return None, f"SerpAPI error: {exc}"

    try:
        from scholarly import scholarly
        author = scholarly.fill(
            scholarly.search_author_id(author_id), sections=["indices"]
        )
        return {
            "citations": int(author.get("citedby") or 0),
            "hIndex": int(author.get("hindex") or 0),
            "i10Index": int(author.get("i10index") or 0),
            "documents": None,
        }, None
    except Exception as exc:
        return None, f"scholarly error (Google may be blocking this IP): {exc}"


# --------------------------------------------------------------------------
# Scopus  (Elsevier Author Retrieval API)
# --------------------------------------------------------------------------
def fetch_scopus(author_id):
    key = os.environ.get("SCOPUS_API_KEY")
    if not author_id:
        return None, "no scopusAuthorId configured"
    if not key:
        return None, "SCOPUS_API_KEY secret not set"

    url = (
        "https://api.elsevier.com/content/author/author_id/"
        f"{author_id}?field=document-count,cited-by-count,h-index"
    )
    req = urllib.request.Request(
        url,
        headers={
            "X-ELS-APIKey": key,
            "Accept": "application/json",
            "User-Agent": "rimanm.com-metrics/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
    except Exception as exc:
        return None, f"Scopus API error: {exc}"

    try:
        entry = payload["author-retrieval-response"][0]
        core = entry.get("coredata", {})
        out = {
            "citations": int(core.get("citation-count") or core.get("cited-by-count") or 0),
            "hIndex": int(entry.get("h-index") or 0),
            "documents": int(core.get("document-count") or 0),
        }
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        return None, f"unexpected Scopus response shape: {exc}"

    return (out, None) if out["citations"] or out["documents"] else (None, "Scopus returned empty figures")


# --------------------------------------------------------------------------
# ORCiD  (public API, no key)
# --------------------------------------------------------------------------
def fetch_orcid(orcid_id):
    if not orcid_id:
        return None, "no orcidId configured"

    url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "rimanm.com-metrics/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
    except Exception as exc:
        return None, f"ORCiD API error: {exc}"

    groups = payload.get("group") or []
    if not groups:
        return None, "ORCiD returned no works"
    return {"citations": None, "hIndex": None, "documents": len(groups)}, None


# --------------------------------------------------------------------------
def main():
    profile = load(PROFILE)
    metrics = load(METRICS)
    metrics.setdefault("sources", {})

    providers = [
        ("scholar", "Google Scholar", fetch_scholar, profile.get("scholarAuthorId")),
        ("scopus", "Scopus", fetch_scopus, profile.get("scopusAuthorId")),
        ("orcid", "ORCiD", fetch_orcid, profile.get("orcidId")),
    ]

    changed = False
    for key, label, fetcher, ident in providers:
        result, why = fetcher(ident)
        block = metrics["sources"].setdefault(key, {"label": label})
        block["label"] = label

        if not result:
            log(f"[{label}] skipped — {why}")
            continue

        for field in ("citations", "hIndex", "i10Index", "documents"):
            if field in result and result[field] is not None:
                if block.get(field) != result[field]:
                    log(f"[{label}] {field}: {block.get(field)} -> {result[field]}")
                    changed = True
                block[field] = result[field]
        block["updated"] = TODAY
        log(f"[{label}] ok")

    # Promote the primary provider's figures to the headline numbers.
    primary = metrics.get("primarySource", "scholar")
    head = metrics["sources"].get(primary, {})
    for src_field, dest_field in (
        ("citations", "citations"),
        ("hIndex", "hIndex"),
        ("i10Index", "i10Index"),
    ):
        value = head.get(src_field)
        if value and metrics.get(dest_field) != value:
            log(f"[headline] {dest_field}: {metrics.get(dest_field)} -> {value}")
            metrics[dest_field] = value
            changed = True

    if not changed:
        log("Nothing changed.")
        return 0

    metrics["updated"] = TODAY
    with open(METRICS, "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    log("metrics.json updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
