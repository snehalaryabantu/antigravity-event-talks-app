import os
import xml.etree.ElementTree as ET
import urllib.request
import datetime
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "updates": [],
    "last_fetched": None,
    "error": None
}

def parse_release_notes():
    try:
        # Fetch the XML feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        all_updates = []
        update_counter = 0
        
        for entry in root.findall('atom:entry', namespaces):
            title = entry.find('atom:title', namespaces)
            date_str = title.text.strip() if title is not None else "Unknown Date"
            
            link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
            base_link = link_elem.get('href') if link_elem is not None else FEED_URL
            
            content_elem = entry.find('atom:content', namespaces)
            html_content = content_elem.text if content_elem is not None else ""
            
            if not html_content:
                continue
                
            soup = BeautifulSoup(html_content, 'html.parser')
            h3_tags = soup.find_all('h3')
            
            if not h3_tags:
                # Fallback: No h3 tags, treat as a single generic update
                update_counter += 1
                all_updates.append({
                    "id": f"update_{update_counter}",
                    "date": date_str,
                    "type": "General",
                    "content_html": html_content.strip(),
                    "content_text": soup.get_text().strip(),
                    "link": base_link
                })
            else:
                for h3 in h3_tags:
                    update_type = h3.get_text().strip()
                    
                    # Accumulate siblings until the next h3 tag
                    sibling_content = []
                    next_node = h3.next_sibling
                    while next_node and next_node.name != 'h3':
                        # Convert bs4 element to string
                        sibling_content.append(str(next_node))
                        next_node = next_node.next_sibling
                    
                    update_html = "".join(sibling_content).strip()
                    temp_soup = BeautifulSoup(update_html, 'html.parser')
                    update_text = temp_soup.get_text().strip()
                    
                    update_counter += 1
                    all_updates.append({
                        "id": f"update_{update_counter}",
                        "date": date_str,
                        "type": update_type,
                        "content_html": update_html,
                        "content_text": update_text,
                        "link": base_link
                    })
                    
        cache["updates"] = all_updates
        cache["last_fetched"] = datetime.datetime.now().isoformat()
        cache["error"] = None
        return all_updates, None
    except Exception as e:
        cache["error"] = str(e)
        return cache["updates"], str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/updates", methods=["GET"])
def get_updates():
    # Fetch if cache is empty
    if not cache["updates"] and not cache["error"]:
        parse_release_notes()
    
    return jsonify({
        "updates": cache["updates"],
        "last_fetched": cache["last_fetched"],
        "error": cache["error"]
    })

@app.route("/api/refresh", methods=["POST"])
def refresh_updates():
    updates, error = parse_release_notes()
    return jsonify({
        "updates": updates,
        "last_fetched": cache["last_fetched"],
        "error": error
    })

if __name__ == "__main__":
    # Fetch initial feed on startup
    parse_release_notes()
    app.run(host="0.0.0.0", port=5001, debug=True)
