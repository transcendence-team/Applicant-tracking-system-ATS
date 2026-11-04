

# ==============================================================================
# 1. Pydantic Schema Descriptions (Used for Constrained Decoding)
# ==============================================================================
SCHEMA_DESCRIPTIONS = {
    # Descriptions for individual skill matching
    "skill_name": "Name of the skill from required_skills",
    "match_type": "EXACT if found, RELATED if similar tech found, MISSING if absent",
    "skill_explanation": "1 sentence explaining the match or lack thereof",
    # Descriptions for overall candidate evaluation
    "candidate_summary": "2-3 sentence overview of the candidate's background and suitability",
    "match_score": "Score between 0.0 and 100.0 based on skill and experience match",
    "recommendation": "Overall hiring recommendation",
    "skills_list": "Evaluation of each required skill",
}

# ==============================================================================
# 2. System Prompt Template
# ==============================================================================
# Available placeholder: {json_schema}
SYSTEM_PROMPT_TEMPLATE = """You are an expert Applicant Tracking System (ATS) evaluator.
Analyze the candidate's resume against the target job requirements objectively.
You must respond ONLY with a valid JSON object strictly matching this schema:
{json_schema}"""

# ==============================================================================
# 3. User Prompt Template
# ==============================================================================
# Available placeholders: {job_title}, {job_description}, {required_skills}, {resume_text}
USER_PROMPT_TEMPLATE = """=== JOB REQUIREMENTS ===
Title: {job_title}
Description: {job_description}
Required Skills: {required_skills}

=== CANDIDATE RESUME ===
{resume_text}
"""

