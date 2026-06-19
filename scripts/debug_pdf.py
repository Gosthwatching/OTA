import pdfplumber

PDF_PATH = "data/FBOTAV324Web.pdf"

with pdfplumber.open(PDF_PATH) as pdf:
    for page_number, page in enumerate(pdf.pages[:3]):  # 3 premières pages
        print(f"\n===== PAGE {page_number+1} =====\n")
        text = page.extract_text()
        if not text:
            print("(page vide)")
            continue

        lines = text.split("\n")
        for i, line in enumerate(lines[:50]):  # 50 premières lignes
            print(f"{i:02d}: {line}")
