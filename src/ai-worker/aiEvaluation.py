import os
import json
from typing import Literal
from pydantic import BaseModel, Field
from openai import OpenAI

from prompts import (
    SCHEMA_DESCRIPTIONS,
    SYSTEM_PROMPT_TEMPLATE,
    USER_PROMPT_TEMPLATE,
)


class SkillMatch(BaseModel):
    skill_name: str = Field(description=SCHEMA_DESCRIPTIONS["skill_name"])
    match_type: Literal["EXACT", "RELATED", "MISSING"] = Field(
        description=SCHEMA_DESCRIPTIONS["match_type"]
    )
    explanation: str = Field(description=SCHEMA_DESCRIPTIONS["skill_explanation"])


class CandidateEvaluation(BaseModel):
    summary: str = Field(description=SCHEMA_DESCRIPTIONS["candidate_summary"])
    match_score: float = Field(description=SCHEMA_DESCRIPTIONS["match_score"])
    recommendation: Literal["STRONG_MATCH", "MATCH", "PARTIAL_MATCH", "NO_MATCH"] = Field(
        description=SCHEMA_DESCRIPTIONS["recommendation"]
    )
    skills: list[SkillMatch] = Field(description=SCHEMA_DESCRIPTIONS["skills_list"])


def get_llm_client() -> OpenAI:
    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")

    if not api_key and "localhost" not in base_url and "ollama" not in base_url:
        raise ValueError(
            "LLM_API_KEY is not set! Please add your free API key to your .env file."
        )

    return OpenAI(base_url=base_url, api_key=api_key or "ollama")


def evaluate_candidate(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: list[str],
) -> CandidateEvaluation:
    client = get_llm_client()
    model = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")

    json_schema = json.dumps(CandidateEvaluation.model_json_schema(), indent=2)

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(json_schema=json_schema)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        job_title=job_title,
        job_description=job_description,
        required_skills=", ".join(required_skills),
        resume_text=resume_text,
    )

    try:
        response = client.beta.chat.completions.parse(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=CandidateEvaluation,
            temperature=0.1,
        )
        parsed = response.choices[0].message.parsed
        if parsed is not None:
            return parsed
    except Exception:
        pass

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    raw_json = response.choices[0].message.content or "{}"
    return CandidateEvaluation.model_validate_json(raw_json)
