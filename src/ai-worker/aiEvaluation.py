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


def get_cloud_client() -> OpenAI:
    # Initializes cloud API client (Groq / OpenAI / Gemini)
    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")

    if not api_key:
        raise ValueError(
            "LLM_API_KEY is not set! Please add your API key to .env for cloud fallback."
        )

    return OpenAI(base_url=base_url, api_key=api_key)


def _execute_llm_call(
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
) -> CandidateEvaluation:
    # Executes inference with constrained decoding and universal JSON fallback
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

    # Fallback to standard JSON Mode
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


def evaluate_candidate(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: list[str],
) -> CandidateEvaluation:
    json_schema = json.dumps(CandidateEvaluation.model_json_schema(), indent=2)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(json_schema=json_schema)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        job_title=job_title,
        job_description=job_description,
        required_skills=", ".join(required_skills),
        resume_text=resume_text,
    )

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434/v1")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

    try:
        ollama_client = OpenAI(base_url=ollama_url, api_key="ollama", timeout=5.0)
        result = _execute_llm_call(ollama_client, ollama_model, system_prompt, user_prompt)
        return result
    except Exception as ollama_err:
        print(f"⚠️ [LLM] Ollama unavailable ({ollama_err}). Falling back to Cloud API...")

    cloud_client = get_cloud_client()
    cloud_model = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
    result = _execute_llm_call(cloud_client, cloud_model, system_prompt, user_prompt)
    return result
