# Angle Detection Webapp

A web application that calculates the angle between two lines in images. Supports both manual line drawing and automatic line detection using OpenCV.

## Features

- **Manual Mode**: Click and drag to draw lines directly on images
- **Auto Mode**: Automatic line detection using Canny edge detection and Hough Transform
- **Draggable Endpoints**: Adjust line positions by dragging endpoints
- **Real-time Angle Calculation**: Angle updates as lines are modified

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python FastAPI + OpenCV
- **Styling**: Custom CSS with futuristic dark theme

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   └── services/
│   │       ├── line_detector.py    # OpenCV line detection
│   │       └── angle_calculator.py # Angle calculation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   ├── App.css            # Styling
│   │   └── components/         # UI components
│   └── package.json
└── CLAUDE.md
```

## Running the Application

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and connects to the backend at http://localhost:8000.

## Usage

1. Upload an image (JPEG, PNG, or WebP)
2. Choose Manual or Auto mode
3. **Manual Mode**: Click to place line endpoints, drag to adjust
4. **Auto Mode**: Click "Scan for Lines" to detect lines, then select two lines to calculate angle
5. The angle between the two lines is displayed in degrees