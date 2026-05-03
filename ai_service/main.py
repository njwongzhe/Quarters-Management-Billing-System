from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_penghuni_from_xlsx


app = FastAPI(
    title="Kuarters AI Extraction Service",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):30\d\d",
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
    limit: int = Query(default=3, ge=1, le=50),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .xlsx sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_penghuni_from_xlsx(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data penghuni: {error}",
        ) from error
