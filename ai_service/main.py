import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractor import (
    extract_bayaran_from_pdf,
    extract_kuarters_document,
    extract_penghuni_document,
    extract_tunggakan_document,
)

# This is the main entry point for the Kuarters AI Extraction Service API. It defines the FastAPI app, configures CORS, and sets up endpoints for health checks and data extraction from uploaded files. Each extraction endpoint validates the uploaded file, reads its contents, and calls the appropriate extractor function. Errors during extraction are handled gracefully with HTTP exceptions.
app = FastAPI(
    title="Kuarters AI Extraction Service",
    version="0.1.0",
)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def load_local_env() -> None:
    env_path = Path(__file__).with_name(".env")

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        normalized_line = line.strip()

        if not normalized_line or normalized_line.startswith("#"):
            continue

        key, separator, value = normalized_line.partition("=")

        if not separator:
            continue

        os.environ[key.strip()] = value.strip().strip("\"'")


def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("AI_SERVICE_ALLOWED_ORIGINS", "")
    origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]

    # If no valid origins are configured, fall back to the default allowed origins.
    return origins or DEFAULT_ALLOWED_ORIGINS

# Load environment variables from .env file if it exists. This allows for local configuration of the AI service without requiring environment variables to be set globally.
load_local_env()

# Configure CORS from the AI service environment. Localhost remains the default
# for development when AI_SERVICE_ALLOWED_ORIGINS is not set.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/extract/penghuni")
async def extract_penghuni(
    file: UploadFile = File(...),
    parsing_mode: str = Query(default="strict", pattern="^(strict|assisted)$"),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Sila muat naik fail .xlsx atau .pdf sahaja.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_penghuni_document(
            file_bytes,
            file.filename,
            parsing_mode=parsing_mode,
            limit=limit,
        )
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data penghuni: {error}",
        ) from error


@app.post("/extract/bayaran")
async def extract_bayaran(
    file: UploadFile = File(...),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .pdf sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_bayaran_from_pdf(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data bayaran: {error}",
        ) from error


@app.post("/extract/kuarters")
async def extract_kuarters(
    file: UploadFile = File(...),
    parsing_mode: str = Query(default="strict", pattern="^(strict|assisted)$"),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Sila muat naik fail .xlsx atau .pdf sahaja.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_kuarters_document(
            file_bytes,
            file.filename,
            parsing_mode=parsing_mode,
            limit=limit,
        )
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data kuarters: {error}",
        ) from error


@app.post("/extract/tunggakan")
async def extract_tunggakan(
    file: UploadFile = File(...),
    parsing_mode: str = Query(default="strict", pattern="^(strict|assisted)$"),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Sila muat naik fail .xlsx atau .pdf sahaja.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_tunggakan_document(
            file_bytes,
            file.filename,
            parsing_mode=parsing_mode,
            limit=limit,
        )
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data tunggakan: {error}",
        ) from error
