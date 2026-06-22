# BigQuery Release Notes Tracker

A sleek, responsive, and high-fidelity web application built with **Python Flask** and **Vanilla HTML5, CSS3, and JavaScript** that fetches, parses, caches, and presents the official Google Cloud BigQuery release notes. It also allows you to easily draft and post updates directly to Twitter/X.

## 🚀 Features

- **Automated RSS Feed Fetching**: Integrates directly with the official Google Cloud BigQuery Atom feed.
- **Granular Update Parsing**: Intelligently parses daily release logs and splits them by categories (e.g., `Feature`, `Announcement`, `Issue`, `Changed`, `Deprecated`) under individual cards.
- **In-Memory Caching**: Caches parsed results on the server side to provide instant page loads, with a quick-refresh action to fetch live updates.
- **Modern Dark-Mode UI**: Built with a custom HSL-based space design, featuring radial glows, glassmorphic layout cards, transition animations, and responsive grids.
- **Analytics Dashboard**: Displays current release note stats, including total counts and counts grouped by type (Features, Announcements, Issues).
- **Fuzzy Search & Filters**: Filter release notes instantly by categories or search keywords in real-time.
- **Smart Twitter/X Sharing**: Comes with an embedded tweet composer that auto-trims descriptions to stay within 280 characters, accounting for Twitter's 23-character t.co URL shortening limit.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, `BeautifulSoup4` (HTML splitting), `xml.etree.ElementTree` (Atom XML parsing)
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, Keyframe Animations, Glassmorphic effects), Vanilla JavaScript (ES6+, DOM Manipulation)
- **Icons**: FontAwesome 6 (CDN)
- **Typography**: Google Fonts (Plus Jakarta Sans & JetBrains Mono)

---

## 📂 Project Structure

```text
bq-release-notes/
├── app.py                 # Flask server with feed parsing & cache API
├── requirements.txt       # Python package dependencies
├── .gitignore             # Git ignore definitions
├── README.md              # Project documentation
├── templates/
│   └── index.html         # Main dashboard layout template
└── static/
    ├── style.css          # Design system & responsive styles
    └── script.js          # Interactive UI & search/sharing logic
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have **Python 3.8+** installed.

### Setup and Running

1. **Clone or navigate to the directory**:
   ```bash
   cd bq-release-notes
   ```

2. **Create a virtual environment**:
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**:
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```cmd
     venv\Scripts\activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the Flask application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   Open your browser and navigate to **[http://localhost:5001](http://localhost:5001)**.

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
