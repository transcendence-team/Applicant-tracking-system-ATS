import os
import json
# import logging
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from openai import AsyncOpenAI, BadRequestError

from prompts import (
    SCHEMA_DESCRIPTIONS,
    SYSTEM_PROMPT_TEMPLATE,
    USER_PROMPT_TEMPLATE,
)

# logger = logging.getLogger(__name__)

_cloud_client: AsyncOpenAI | None = None


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

    @field_validator("match_score")
    @classmethod
    def validate_match_score(cls, value: float) -> float:
        if not (0.0 <= value <= 100.0):
            raise ValueError("match_score must be between 0.0 and 100.0")
        return value


def get_cloud_client() -> AsyncOpenAI:
    global _cloud_client
    if _cloud_client is None:
        api_key = os.getenv("LLM_API_KEY", "")
        base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
        timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "30.0"))

        if not api_key:
            raise ValueError(
                "LLM_API_KEY is not set! Please add your API key to .env."
            )

        _cloud_client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
            max_retries=2,
        )

    return _cloud_client


async def close_cloud_client() -> None:
    global _cloud_client
    if _cloud_client is not None:
        await _cloud_client.close()
        _cloud_client = None


async def _execute_llm_call(
    client: AsyncOpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
) -> CandidateEvaluation:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        response = await client.beta.chat.completions.parse(
            model=model,
            messages=messages,
            response_format=CandidateEvaluation,
            temperature=0.1,
        )
        parsed = response.choices[0].message.parsed
        if parsed is not None:
            return parsed
        # logger.warning("Constrained decoding returned empty parsed result; falling back to JSON mode.")
    except (BadRequestError, NotImplementedError) as exc:
        # logger.warning("Constrained decoding not supported (%s); falling back to JSON mode.", exc)
        pass

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    raw_json = response.choices[0].message.content or "{}"
    return CandidateEvaluation.model_validate_json(raw_json)


async def evaluate_candidate(
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

    cloud_client = get_cloud_client()
    cloud_model = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
    return await _execute_llm_call(cloud_client, cloud_model, system_prompt, user_prompt)

