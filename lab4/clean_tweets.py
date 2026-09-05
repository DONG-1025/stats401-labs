import pandas as pd
import re
from nltk.stem import WordNetLemmatizer
from transformers import pipeline
import nltk

df = pd.read_csv(
    "../data/lab4_raw_tweets.csv",
    encoding="latin-1",
    header=None,
    names=["target", "ids", "date", "flag", "user", "tweet_text"]
)

print("Raw data shape:", df.shape)

df = df.sample(n=2000, random_state=42).reset_index(drop=True)
print("Sampled data shape:", df.shape)

df = df.dropna(subset=["tweet_text"])
df = df.drop_duplicates()

try:
    df["created_at"] = pd.to_datetime(df["date"], errors="coerce", format="%a %b %d %H:%M:%S PDT %Y")
except:
    df["created_at"] = pd.to_datetime(df["date"], errors="coerce")

df = df.dropna(subset=["created_at"])
df["date"] = df["created_at"].dt.date
df["hour"] = df["created_at"].dt.hour
df["weekday"] = df["created_at"].dt.day_name()

df["tweet_id"] = df["ids"]
df["username"] = df["user"].astype(str).str.strip()
df["platform"] = "Web"
df["country"] = "Unknown"
df["likes"] = 0
df["retweets"] = 0

print("Cleaned shape:", df.shape)

if len(df) == 0:
    print("Error: No data remaining after cleaning!")
    exit()

def normalize_tweet(text):
    text = str(text).lower()
    text = re.sub(r"https?://\S+|www\.\S+", " URL ", text)
    text = re.sub(r"@\w+", " USER ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\b", " NUMBER ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

df["text_normalized"] = df["tweet_text"].apply(normalize_tweet)

def simple_tokenize(text):
    return text.split()

df["tokens"] = df["text_normalized"].apply(simple_tokenize)

STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
    "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself",
    "they", "them", "their", "theirs", "themselves", "am", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing",
    "will", "would", "shall", "should", "may", "might", "must", "a", "an", "the", "and",
    "but", "or", "for", "nor", "on", "at", "to", "by", "in", "of", "off", "with", "without",
    "so", "than", "that", "then", "thence", "these", "they", "this", "those", "through",
    "until", "up", "upon", "what", "when", "where", "wherever", "whether", "which",
    "while", "who", "whom", "whose", "why", "will", "with", "within", "without", "would"
}

df["tokens_no_stop"] = df["tokens"].apply(
    lambda tokens: [t for t in tokens if t.lower() not in STOPWORDS]
)

lemmatizer = WordNetLemmatizer()
df["tokens_clean"] = df["tokens_no_stop"].apply(
    lambda tokens: [lemmatizer.lemmatize(t) for t in tokens if t.isalpha()]
)
df["text_clean"] = df["tokens_clean"].apply(" ".join)

def prepare_for_roberta(text):
    text = str(text)
    text = re.sub(r"@\w+", "@user", text)
    text = re.sub(r"https?://\S+|www\.\S+", "http", text)
    return text.strip()

df["sentiment_text"] = df["tweet_text"].fillna("").apply(prepare_for_roberta)

print("Loading sentiment analysis model...")
sentiment_model = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    top_k=None
)

print("Analyzing tweet sentiment...")
batch_size = 16
results = []
for i in range(0, len(df), batch_size):
    batch = df["sentiment_text"].tolist()[i:i+batch_size]
    batch_results = sentiment_model(batch, truncation=True)
    results.extend(batch_results)

def scores_to_dict(scores):
    return {item["label"].lower(): item["score"] for item in scores}

score_dicts = [scores_to_dict(scores) for scores in results]

df["sentiment_negative"] = [s.get("negative", 0) for s in score_dicts]
df["sentiment_neutral"] = [s.get("neutral", 0) for s in score_dicts]
df["sentiment_positive"] = [s.get("positive", 0) for s in score_dicts]

def predicted_label(scores):
    return max(scores, key=scores.get).capitalize()

df["sentiment"] = [predicted_label(s) for s in score_dicts]
df["sentiment_score"] = df["sentiment_positive"] - df["sentiment_negative"]

print("Sentiment distribution:")
print(df["sentiment"].value_counts())

keep_cols = [
    "tweet_id", "created_at", "date", "hour", "weekday",
    "username", "platform", "country",
    "tweet_text", "text_clean",
    "likes", "retweets",
    "sentiment", "sentiment_score",
    "sentiment_negative", "sentiment_neutral", "sentiment_positive"
]

vis_cols = [col for col in keep_cols if col in df.columns]
vis_df = df[vis_cols].copy()

print("Final data shape:", vis_df.shape)
print(vis_df.head())

vis_df.to_csv("../data/lab4_clean_tweets.csv", index=False)
print("Cleaned data saved to: data/lab4_clean_tweets.csv")

sentiment_counts = (
    vis_df["sentiment"]
    .value_counts()
    .rename_axis("sentiment")
    .reset_index(name="count")
)
sentiment_counts.to_csv("../data/sentiment_counts.csv", index=False)

if "platform" in vis_df.columns:
    sentiment_platform = (
        vis_df
        .groupby(["platform", "sentiment"])
        .size()
        .reset_index(name="count")
    )
    sentiment_platform.to_csv("../data/sentiment_by_platform.csv", index=False)

if "weekday" in vis_df.columns:
    sentiment_time = (
        vis_df
        .groupby("weekday")["sentiment_score"]
        .mean()
        .reset_index()
    )
    sentiment_time.to_csv("../data/sentiment_by_weekday.csv", index=False)

print("Aggregated data saved")