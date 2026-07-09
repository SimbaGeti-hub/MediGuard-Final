import tiktoken

PRICING = {
    "gpt-4o":                       {"input": 0.0025, "output": 0.010},
    "gpt-4o-mini":                  {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo":                  {"input": 0.01, "output": 0.03},
    "claude-3-5-sonnet-20241022":   {"input": 0.003, "output": 0.015},
}


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        enc = tiktoken.encoding_for_model(model if "gpt" in model else "gpt-4o")
        return len(enc.encode(text))
    except Exception:
        return len(text.split()) * 2


def calculate_cost(tokens: int, model: str = "gpt-4o") -> float:
    price = PRICING.get(model, PRICING["gpt-4o"])
    return round((tokens / 1000) * price["output"], 6)
