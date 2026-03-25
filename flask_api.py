import os
from flask import Flask, render_template


print(os.environ.get("OPENAI_API_KEY"))

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)