import pdfplumber
import pandas as pd
import re
import numpy as np
from sentence_transformers import SentenceTransformer
import umap
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

PDF_PATH = "../data/V2021-22_DKU_UG_Bulletin.pdf"


def extract_passages(pdf_path):
    passages = []
    passage_id = 0

    with pdfplumber.open(pdf_path) as pdf:
        print("Total pages:", len(pdf.pages))

        for page_num, page in enumerate(pdf.pages, start=1):
            if page_num % 20 == 0:
                print(f"Processing page {page_num}...")

            text = page.extract_text() or ""
            paragraphs = re.split(r"\n\s*\n", text)

            section_name = f"Pages {(page_num - 1) // 25 * 25 + 1}-{(page_num - 1) // 25 * 25 + 25}"

            for para in paragraphs:
                para = re.sub(r"\s+", " ", para).strip()
                if len(para.split()) < 15:
                    continue

                passage_id += 1
                passages.append({
                    "passage_id": f"p{passage_id:04d}",
                    "chapter": "DKU Bulletin",
                    "section": section_name,
                    "subsection": "",
                    "page": page_num,
                    "text": para
                })

    return pd.DataFrame(passages)


print("Extracting passages from PDF...")
df = extract_passages(PDF_PATH)
print("Raw passages:", len(df))

df = df.dropna(subset=["text"])
df = df.drop_duplicates(subset=["text"])
df["text_clean"] = df["text"].str.replace(r"\s+", " ", regex=True).str.strip()
df = df[df["text_clean"].str.split().str.len() >= 15]

df = df.reset_index(drop=True)

print("Cleaned passages:", len(df))

df["word_count"] = df["text_clean"].str.split().str.len()

print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

embeddings = model.encode(
    df["text_clean"].tolist(),
    normalize_embeddings=True,
    show_progress_bar=True,
    batch_size=32
)

print("Embeddings shape:", embeddings.shape)

print("Running UMAP...")
reducer = umap.UMAP(
    n_components=2,
    n_neighbors=15,
    min_dist=0.15,
    metric="cosine",
    random_state=401
)

coords = reducer.fit_transform(embeddings)
df["x"] = coords[:, 0]
df["y"] = coords[:, 1]

print("Running KMeans clustering...")
kmeans = KMeans(n_clusters=8, random_state=401, n_init="auto")
df["cluster"] = kmeans.fit_predict(embeddings)

print("Extracting top TF-IDF terms per cluster...")
tfidf = TfidfVectorizer(max_df=0.9, min_df=1, stop_words="english")
tfidf_matrix = tfidf.fit_transform(df["text_clean"])
terms = tfidf.get_feature_names_out()

for c in sorted(df["cluster"].unique()):
    idx = (df["cluster"] == c).values
    mean_scores = np.asarray(tfidf_matrix[idx].mean(axis=0)).ravel()
    top_idx = mean_scores.argsort()[::-1][:8]
    top_terms = [terms[i] for i in top_idx]
    print(f"Cluster {c} top terms: {top_terms}")

df["cluster_name"] = df["cluster"].apply(lambda c: f"Topic {c}")

df.to_csv("../data/lab8_embedding_map.csv", index=False)
print("Saved: data/lab8_embedding_map.csv")

matrix = df.groupby(["section", "cluster_name"]).size().reset_index(name="count")
matrix.to_csv("../data/lab8_topic_section_matrix.csv", index=False)
print("Saved: data/lab8_topic_section_matrix.csv")

print("Done!")