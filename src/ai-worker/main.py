import traceback
from typing import Dict, Any
from fastapi import FastAPI, BackgroundTasks, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pdfExtractor import extractPdf
from aiEvaluation import evaluate_candidate, CandidateEvaluation

app = FastAPI(title="ATS AI Worker")

# In-memory store for evaluation results (useful for testing before DB persistence)
evaluation_store: Dict[int, Dict[str, Any]] = {}


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-worker"}


@app.get("/models")
def list_available_models():
    # Lists all available models provided by the configured LLM API key
    try:
        from aiEvaluation import get_cloud_client
        client = get_cloud_client()
        models = client.models.list()
        return {"models": [m.id for m in models.data]}
    except Exception as exc:
        return {"error": str(exc)}


class ParseRequest(BaseModel):
    application_id: int
    resume_id: int
    file_path: str
    job_id: int
    job_title: str
    job_description: str
    required_skills: list[str] = []


def process_resume_pipeline(data: ParseRequest):
    try:
        evaluation_store[data.application_id] = {
            "status": "PROCESSING",
            "application_id": data.application_id,
            "resume_id": data.resume_id,
        }

        extracted_text = extractPdf(data.file_path)
    
        evaluation = evaluate_candidate(
            resume_text=extracted_text,
            job_title=data.job_title,
            job_description=data.job_description,
            required_skills=data.required_skills,
        )

        evaluation_store[data.application_id] = {
            "status": "COMPLETED",
            "application_id": data.application_id,
            "resume_id": data.resume_id,
            "job_title": data.job_title,
            "evaluation": evaluation.model_dump(),
        }

    except Exception as exc:
        traceback.print_exc()
        evaluation_store[data.application_id] = {
            "status": "FAILED",
            "application_id": data.application_id,
            "error": str(exc),
        }


@app.post("/parse", status_code=status.HTTP_202_ACCEPTED)
def parse_resume(data: ParseRequest, background_tasks: BackgroundTasks):
    print(f"Received parse request for application {data.application_id} (scheduling background task)...")

    # Queue background task
    background_tasks.add_task(process_resume_pipeline, data)

    # Return HTTP 202 Accepted immediately
    return {
        "status": "PROCESSING",
        "message": f"Resume parsing queued for application {data.application_id}",
        "application_id": data.application_id,
        "resume_id": data.resume_id,
    }


@app.get("/status/{application_id}")
def get_parse_status(application_id: int):
    if application_id not in evaluation_store:
        return JSONResponse(
            status_code=404,
            content={"error": "NOT_FOUND", "message": f"No task found for application {application_id}"},
        )
    return evaluation_store[application_id]
