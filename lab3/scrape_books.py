import requests
import time
import pandas as pd
from bs4 import BeautifulSoup

BASE_URL = "https://books.toscrape.com/catalogue/"
HEADERS = {
    "User-Agent": "STATS401-Class-Exercise/1.0"
}
PAGE_COUNT = 50
DELAY = 0.5


def scrape_page(page_num):
    url = f"{BASE_URL}page-{page_num}.html"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Page {page_num} request failed: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    books = soup.select("article.product_pod")

    records = []
    for book in books:
        title_elem = book.select_one("h3 a")
        title = title_elem.get("title", "Unknown") if title_elem else "Unknown"

        price_elem = book.select_one(".price_color")
        price_text = price_elem.get_text(strip=True) if price_elem else "£0.00"
        price = float(price_text.replace("£", "").replace("Â", ""))

        rating_elem = book.select_one("p.star-rating")
        rating_class = rating_elem.get("class", []) if rating_elem else []
        rating_map = {
            "One": 1, "Two": 2, "Three": 3,
            "Four": 4, "Five": 5
        }
        rating = rating_map.get(rating_class[-1], 0) if rating_class else 0

        availability_elem = book.select_one(".instock.availability")
        in_stock = availability_elem is not None

        records.append({
            "title": title,
            "price": price,
            "rating": rating,
            "in_stock": in_stock,
            "page": page_num
        })

    return records


def main():
    print("=" * 50)
    print("Scraping Books to Scrape")
    print("=" * 50)

    all_records = []

    for page in range(1, PAGE_COUNT + 1):
        print(f"Scraping page {page}/{PAGE_COUNT}...", end=" ")

        records = scrape_page(page)
        all_records.extend(records)

        print(f"Got {len(records)} books, total {len(all_records)}")

        time.sleep(DELAY)

    print("=" * 50)
    print(f"Total records: {len(all_records)}")

    df = pd.DataFrame(all_records)

    output_path = "../data/books.csv"
    df.to_csv(output_path, index=False, encoding="utf-8")
    print(f"Data saved to: {output_path}")

    print("\nData preview:")
    print(df.head().to_string())


if __name__ == "__main__":
    main()