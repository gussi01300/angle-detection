from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import uuid
import shutil
from pathlib import Path

from .services.line_detector import detect_lines
from .services.angle_calculator import calculate_angle


app = FastAPI(title="Angle Detection API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for uploaded images
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
image_store: Dict[str, str] = {}  # image_id -> filepath


class DetectLinesRequest(BaseModel):
    image_id: str
    canny_low: int = 50
    canny_high: int = 150
    min_line_length: int = 50
    max_line_gap: int = 20
    buffer_radius: int = 5


class CalculateAngleRequest(BaseModel):
    line1: Dict[str, int]
    line2: Dict[str, int]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/v1/upload")
async def upload_image(file: UploadFile) -> dict:
    """Upload an image and return an image_id."""
    image_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()

    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    filepath = UPLOAD_DIR / f"{image_id}{ext}"
    with file.file as f:
        with open(filepath, "wb") as out:
            shutil.copyfileobj(f, out)

    image_store[image_id] = str(filepath)

    return {"image_id": image_id, "filename": file.filename}


@app.post("/api/v1/detect-lines")
async def detect_lines_endpoint(request: DetectLinesRequest) -> dict:
    """Detect lines in an image using OpenCV."""
    if request.image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    image_path = image_store[request.image_id]

    lines = detect_lines(
        image_path,
        canny_low=request.canny_low,
        canny_high=request.canny_high,
        min_line_length=request.min_line_length,
        max_line_gap=request.max_line_gap,
        buffer_radius=request.buffer_radius
    )

    return {"image_id": request.image_id, "lines": lines}


@app.post("/api/v1/calculate-angle")
async def calculate_angle_endpoint(request: CalculateAngleRequest) -> dict:
    """Calculate the angle between two lines."""
    angle = calculate_angle(
        request.line1["x1"], request.line1["y1"],
        request.line1["x2"], request.line1["y2"],
        request.line2["x1"], request.line2["y1"],
        request.line2["x2"], request.line2["y2"]
    )

    return {
        "angle": angle,
        "line1": request.line1,
        "line2": request.line2
    }


@app.get("/api/v1/image/{image_id}")
async def get_image(image_id: str):
    """Retrieve an image by ID."""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    from fastapi.responses import FileResponse
    return FileResponse(image_store[image_id])


@app.delete("/api/v1/image/{image_id}")
async def delete_image(image_id: str):
    """Delete an uploaded image."""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    filepath = Path(image_store[image_id])
    if filepath.exists():
        filepath.unlink()

    del image_store[image_id]

    return {"status": "deleted", "image_id": image_id}