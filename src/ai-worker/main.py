from fastapi import FastAPI
from pydantic import BaseModel
from pdfExtractor import extractPdf

app = FastAPI()


class ParseRequest(BaseModel):
    application_id: int
    resume_id: int
    file_path: str
    job_id: int
    job_title: str
    job_description: str
    required_skills: list[str] = []


@app.post("/parse")
def parse_resume(data: ParseRequest):

    extracted_text = extractPdf(data.file_path)

    return {
        "status": "extracted",
        "application_id": data.application_id,
        "resume_id": data.resume_id,
        "job_title": data.job_title,
        "text_length": len(extracted_text),
        "snippet": extracted_text[:200] + "...",
    }

