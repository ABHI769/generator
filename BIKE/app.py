import re
import statistics
from flask import Flask, render_template, request, jsonify
from ddgs import DDGS

app = Flask(__name__)

OWNER_FACTORS = {
    "1st owner": 1.0,
    "2nd owner": 0.88,
    "3rd owner": 0.78,
    "4th+ owner": 0.68,
}

CURRENCY_PATTERNS = [
    (r"(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)", "INR"),
    (r"([\d,]+(?:\.\d+)?)\s*(?:lakh|lac)\b", "INR_LAKH"),
    (r"\$\s*([\d,]+(?:\.\d+)?)", "USD"),
]


def _normalize_inr(value: float, matched_text: str) -> float:
    if re.search(r"lakh|lac", matched_text, re.IGNORECASE):
        return value * 100_000
    if value < 500:
        return value * 100_000
    return value


def parse_price(text: str) -> list[float]:
    """Extract numeric prices from search result text."""
    prices = []

    for pattern, currency in CURRENCY_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).replace(",", "")
            try:
                value = float(raw)
            except ValueError:
                continue

            if currency == "INR_LAKH":
                value *= 100_000
            elif currency == "INR":
                value = _normalize_inr(value, match.group(0))
            elif currency == "USD":
                value *= 83

            if 5_000 <= value <= 50_000_000:
                prices.append(value)

    return prices


def build_search_queries(name: str, model: str, vehicle_type: str) -> list[str]:
    vehicle = f"{name} {model}".strip()
    vtype = vehicle_type.lower()
    return [
        f"{vehicle} {vtype} price India 2025",
        f"{vehicle} on road price",
        f"{vehicle} ex showroom price India",
        f"{vehicle} used price second hand",
    ]


def search_online_prices(name: str, model: str, vehicle_type: str) -> dict:
    queries = build_search_queries(name, model, vehicle_type)
    all_prices = []
    sources = []

    try:
        ddgs = DDGS()
        for query in queries:
            results = list(ddgs.text(query, max_results=5))
            for result in results:
                snippet = f"{result.get('title', '')} {result.get('body', '')}"
                found = parse_price(snippet)
                if found:
                    all_prices.extend(found)
                    sources.append(
                        {
                            "title": result.get("title", "Online listing"),
                            "url": result.get("href", ""),
                            "snippet": result.get("body", "")[:200],
                            "prices_found": found,
                        }
                    )
    except Exception as exc:
        return {"error": str(exc), "prices": [], "sources": []}

    return {"prices": all_prices, "sources": sources[:6], "error": None}


def estimate_price(prices: list[float], owner: str) -> dict | None:
    if not prices:
        return None

    factor = OWNER_FACTORS.get(owner, 0.85)
    median = statistics.median(prices)
    low = min(prices) * factor
    high = max(prices) * factor
    estimated = median * factor

    return {
        "estimated": round(estimated),
        "low": round(low),
        "high": round(high),
        "owner_factor": factor,
        "sample_count": len(prices),
    }


def format_inr(amount: float) -> str:
    if amount >= 100_000:
        return f"₹{amount / 100_000:.2f} Lakh"
    return f"₹{amount:,.0f}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/price", methods=["POST"])
def get_price():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    model = (data.get("model") or "").strip()
    vehicle_type = (data.get("vehicle_type") or "").strip()
    owner = (data.get("owner") or "1st owner").strip()

    if not name or not model or not vehicle_type:
        return jsonify({"error": "Name, model, and vehicle type are required."}), 400

    search_result = search_online_prices(name, model, vehicle_type)
    if search_result.get("error") and not search_result.get("prices"):
        return jsonify({"error": f"Could not fetch online prices: {search_result['error']}"}), 502

    estimate = estimate_price(search_result["prices"], owner)

    if not estimate:
        return jsonify(
            {
                "error": "No pricing data found online for this vehicle. Try a more specific name or model.",
                "sources": search_result.get("sources", []),
            }
        ), 404

    return jsonify(
        {
            "vehicle": {
                "name": name,
                "model": model,
                "vehicle_type": vehicle_type,
                "owner": owner,
            },
            "price": {
                **estimate,
                "estimated_formatted": format_inr(estimate["estimated"]),
                "low_formatted": format_inr(estimate["low"]),
                "high_formatted": format_inr(estimate["high"]),
            },
            "sources": search_result.get("sources", []),
            "disclaimer": "Prices are estimated from publicly available online listings and adjusted for ownership.",
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
