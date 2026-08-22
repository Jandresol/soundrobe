# Recommendation Evaluation

Before AWIN is trusted as the main commerce provider, evaluate real retrieval separately from ranking.

## Intent Retrieval Review

For each reviewed intent, record:

```text
INTENT
category:
garmentType:
colors:
materials:
aesthetics:

QUERY
"..."

RETRIEVED
1. product URL
2. product URL
...
20. product URL

Actually correct category:
Correct garment type:
Useful aesthetic match:
Would actually recommend:
Broken/bad listings:
Duplicates:
Notes:
```

Run this across about 50 garment intents from substantially different music profiles.

Interpretation:

```text
retrieval good + ranking bad = improve scoring/features
retrieval bad + ranking good = improve provider query/filtering
retrieval bad + ranking bad = fix commerce source before UI polish
```

## Ranking Review

For each intent with messy real products, inspect whether the most relevant items land in positions 1-5.

Track:

```text
Top-5 contains obvious match: yes/no
Best result position:
Bad listing in top 5: yes/no
Duplicate in top 5: yes/no
Reason:
```

## Human Spotify Review

Test with 10-20 people who have substantially different listening histories.

For each product recommendation, ask:

```text
Would wear
Maybe
Wouldn't wear
```

For each outfit:

```text
Would wear
Maybe
Wouldn't wear
```

Ask one overall question:

```text
Does this wardrobe feel like your music taste? 1-5
```

Core metrics:

```text
Top-5 precision = "Would wear" products / 5
Outfit acceptance = outfits marked "Would wear" / outfits shown
Music fit score = average 1-5 answer
```
