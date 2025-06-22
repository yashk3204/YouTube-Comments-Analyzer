from flask import Flask, request, jsonify
from flask_cors import CORS
app = Flask(__name__)
CORS(app, origins=["http://localhost:5501"])

from googleapiclient.discovery import build
import re
import nltk
nltk.download('stopwords')
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
nltk.download('vader_lexicon')
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=API_KEY)
sia = SentimentIntensityAnalyzer()
english_stopwords = set(stopwords.words('english'))

def get_comments(video_id, max_comments=100):
    comments = []
    next_page_token = None

    while len(comments) < max_comments:
        response = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=min(100, max_comments - len(comments)),
            pageToken=next_page_token,
            textFormat="plainText"
        ).execute()

        for item in response["items"]:
            comment = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
            comments.append(comment)

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return comments

def clean_comment(text):
    text = re.sub(r"http\S+", "", text)  # remove links
    text = re.sub(r"[^a-zA-Z\s]", "", text)  # remove emojis, special chars
    text = text.lower()
    words = text.split()
    words = [w for w in words if w not in english_stopwords]
    return " ".join(words)

def get_sentiment(comment):
    score = sia.polarity_scores(comment)['compound']
    if score >= 0.2:
        return 'Positive'
    elif score <= -0.2:
        return 'Negative'
    else:
        return 'Neutral'

# import matplotlib.pyplot as plt
# from collections import Counter

# def plot_sentiments(sentiments):
#     sent_counts = Counter(sentiments)
#     labels = ['Positive', 'Neutral', 'Negative']
#     values = [sent_counts.get(label, 0) for label in labels]

#     plt.figure(figsize=(6, 4))
#     plt.bar(labels, values, color=['green', 'gray', 'red'])
#     plt.title("Sentiment Distribution")
#     plt.ylabel("Number of Comments")
#     plt.tight_layout()
#     os.makedirs('static', exist_ok=True)
#     chart_path = os.path.join('static', 'sentiment_plot.png')
#     plt.savefig(chart_path)
#     plt.close()
#     return chart_path

@app.route("/analyze", methods=["POST"])

def analyze():
    data = request.get_json()
    video_id = data.get("videoId")
    count = int(data.get("count", 50))

    try:
        comments = get_comments(video_id, count)
        cleaned = [clean_comment(c) for c in comments]
        results = {"Positive": [], "Neutral": [], "Negative": []}
        for raw, cleaned in zip(comments, cleaned):
            sentiment = get_sentiment(cleaned)
            results[sentiment].append(raw)

        return jsonify({
            "positive": len(results["Positive"]),
            "neutral": len(results["Neutral"]),
            "negative": len(results["Negative"]),
            "comments": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)