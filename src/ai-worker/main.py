import asyncio
from contextlib import asynccontextmanager
import os
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pdfExtractor import extractPdf
from aiEvaluation import close_cloud_client, evaluate_candidate


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_cloud_client()


app = FastAPI(title="ATS AI Worker", lifespan=lifespan)

MAX_CONCURRENT_EVALUATIONS = int(os.getenv("MAX_CONCURRENT_EVALUATIONS", "10"))
evaluation_semaphore = asyncio.Semaphore(MAX_CONCURRENT_EVALUATIONS)


@app.get("/health")
async def health_check():
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
async def parse_resume(data: ParseRequest):
    try:
        extracted_text = await asyncio.to_thread(extractPdf, data.file_path)

        if not extracted_text or not extracted_text.strip():
            return JSONResponse(
                status_code=422,
                content={
                    "error": "EMPTY_RESUME_TEXT",
                    "message": "No extractable text was found in the PDF resume.",
                },
            )

        async with evaluation_semaphore:
            evaluation = await evaluate_candidate(
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

    except FileNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "error": "RESUME_NOT_FOUND",
                "message": f"Resume PDF not found at path: {data.file_path}",
            },
        )
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "error": type(exc).__name__,
                "message": str(exc),
            },
        )
