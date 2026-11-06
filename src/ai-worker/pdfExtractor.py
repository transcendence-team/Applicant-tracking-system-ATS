import pdfplumber

def extractPdf(pdf_path: str) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        all_text = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_text.append(text)
    return '\n'.join(all_text)