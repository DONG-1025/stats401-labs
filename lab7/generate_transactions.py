import pandas as pd
import random
from datetime import datetime, timedelta

companies = ["c01","c02","c03","c04","c05","c06","c07","c08","c09","c10","c11","c12"]
types = ["goods", "shipping", "components", "materials", "services"]

records = []
start_date = datetime(2026, 1, 1)

random.seed(42)

for day in range(1, 61):
    date = (start_date + timedelta(days=day-1)).strftime("%Y-%m-%d")
    n_links = random.randint(2, 5)
    for _ in range(n_links):
        source, target = random.sample(companies, 2)
        records.append({
            "date": date,
            "day": day,
            "source": source,
            "target": target,
            "amount_usd": random.randint(5000, 35000),
            "transaction_type": random.choice(types),
            "transaction_count": random.randint(1, 4)
        })

df = pd.DataFrame(records)
df.to_csv("../data/lab7_assignment_transactions_60days.csv", index=False)
print("Generated", len(df), "transaction records")