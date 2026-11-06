import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pdfExtractor import extractPdf
from aiEvaluation import evaluate_candidate

app = FastAPI(title="ATS AI Worker")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-worker"}



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
    try:

        extracted_text = extractPdf(data.file_path)

        evaluation = evaluate_candidate(
            resume_text=extracted_text,
            job_title=data.job_title,
            job_description=data.job_description,
            required_skills=data.required_skills,
        )

        return {
            "status": "COMPLETED",
            "application_id": data.application_id,
            "resume_id": data.resume_id,
            "job_title": data.job_title,
            "evaluation": evaluation,
        }

    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "error": type(exc).__name__,
                "message": str(exc),
            },
        )
