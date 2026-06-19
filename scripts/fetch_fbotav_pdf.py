import requests
import os

PDF_URL = "https://www.qsl.net/f1lpt/FBOTAV324Web.pdf"

def download_fbotav():
    print("📄 Téléchargement du PDF FBOTAV324Web…")

    response = requests.get(PDF_URL)
    response.raise_for_status()

    os.makedirs("data", exist_ok=True)
    dest = "data/FBOTAV324Web.pdf"

    with open(dest, "wb") as f:
        f.write(response.content)

    print("✅ PDF téléchargé avec succès :", dest)
    return dest


if __name__ == "__main__":
    download_fbotav()
