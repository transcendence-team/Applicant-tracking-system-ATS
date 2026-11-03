import os
from pypdf import PdfReader

def extractPdf(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF not found at: {file_path}")

    reader = PdfReader(file_path)
    full_text = []

    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            full_text.append(page_text)

    return "\n".join(full_text).strip()