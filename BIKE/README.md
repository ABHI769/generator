# Vehicle Price Finder

A simple web app that estimates vehicle prices based on **name**, **model**, **vehicle type**, and **owner** using publicly available online listings.

## Features

- Search live online listings for pricing data
- Support for bikes, scooters, cars, SUVs, EVs, and commercial vehicles
- Owner-based price adjustment (1st owner holds highest value)
- Shows price range and source links

## Setup

1. Install Python 3.10+

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the app:

```bash
python app.py
```

4. Open [http://localhost:5000](http://localhost:5000) in your browser.

## How it works

1. You enter vehicle details in the form.
2. The backend searches the web for matching price listings.
3. Prices are extracted from search results and averaged.
4. A factor is applied based on ownership (e.g. 2nd owner ≈ 88% of market value).
5. The estimated price and online sources are shown.

## Note

Prices are **estimates** derived from online data. Actual value depends on condition, mileage, location, and demand.
