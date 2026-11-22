from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pypdf import PdfReader
from pypdf.errors import PyPdfError

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_TEXT_LENGTH = 1_000_000
MAX_RESPONSE_TEXT_BYTES = 1_900_000
MAX_PAGES = 100

app = FastAPI(title="ATS Resume Parser")


class ParsedResume(BaseModel):
    rawText: str
    parserVersion: str = "pypdf-v1"


def error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": code, "message": message})


@app.post("/parse", response_model=ParsedResume)
def parse_resume(file: Annotated[UploadFile, File()]) -> ParsedResume | JSONResponse:
    if file.size is not None and file.size > MAX_PDF_BYTES:
        return error(413, "PDF_TOO_LARGE", "PDF exceeds 10 MiB.")
    if file.content_type != "application/pdf" or file.file.read(5) != b"%PDF-":
        return error(415, "PDF_REQUIRED", "Upload a valid PDF.")
    file.file.seek(0)
    try:
        document = PdfReader(file.file)
        if document.is_encrypted:
            return error(422, "ENCRYPTED_PDF", "Upload a PDF without password protection.")
        if len(document.pages) > MAX_PAGES:
            return error(422, "PDF_TOO_MANY_PAGES", "PDF exceeds 100 pages.")
        pages = []
        length = 0
        for page in document.pages:
            text = (page.extract_text() or "").replace("\x00", "").strip()
            length += len(text) + 1
            if length > MAX_TEXT_LENGTH:
                return error(422, "PDF_TEXT_TOO_LARGE", "Extracted text exceeds the limit.")
            pages.append(text)
    except (PyPdfError, ValueError, RecursionError, NotImplementedError):
        return error(422, "PDF_UNREADABLE", "Unable to read the PDF.")

    text = "\n".join(pages).strip()
    if not text:
        return error(422, "PDF_NO_TEXT", "PDF has no extractable text.")
    # Account for JSON escaping before sending a response to the Express client.
    parsed = ParsedResume(rawText=text)
    if len(parsed.model_dump_json().encode("utf-8")) > MAX_RESPONSE_TEXT_BYTES:
        return error(422, "PDF_TEXT_TOO_LARGE", "Extracted text exceeds the limit.")
    return parsed
