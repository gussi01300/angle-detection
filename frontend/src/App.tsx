import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadZone } from './components/UploadZone/UploadZone';
import { ModeSwitch } from './components/ModeSwitch/ModeSwitch';
import { AngleDisplay } from './components/AngleDisplay/AngleDisplay';
import { api, type DetectedLine } from './services/api';
import './App.css';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DragState {
  lineIndex: 0 | 1 | null;
  endPoint: 'start' | 'end' | null;
}

function App() {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [manualLines, setManualLines] = useState<[Line | null, Line | null]>([null, null]);
  const [selectedLineIndices, setSelectedLineIndices] = useState<[number | null, number | null]>([null, null]);
  const [detectedLines, setDetectedLines] = useState<DetectedLine[]>([]);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [angle, setAngle] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragState, setDragState] = useState<DragState>({ lineIndex: null, endPoint: null });
  const [autoParams, setAutoParams] = useState({
    canny_low: 50,
    canny_high: 150,
    min_line_length: 50,
    max_line_gap: 20,
    buffer_radius: 100,
    use_buffer_radius: true,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Natural dimensions from the image
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  // Display size (how image is actually rendered)
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const response = await api.uploadImage(file);
      setImageId(response.image_id);
      setImageUrl(api.getImageUrl(response.image_id));
      setManualLines([null, null]);
      setSelectedLineIndices([null, null]);
      setDetectedLines([]);
      setAngle(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDetectLines = useCallback(async () => {
    if (!imageId) return;
    setLoading(true);
    try {
      const response = await api.detectLines(imageId, autoParams);
      const top5 = response.lines.slice(0, 5);
      setDetectedLines(top5);
      setSelectedLineIndices([null, null]);
      setAngle(null);
    } catch (error) {
      console.error('Detection failed:', error);
      alert('Failed to detect lines');
    } finally {
      setLoading(false);
    }
  }, [imageId, autoParams]);

  const handleAutoLineSelect = useCallback((index: number) => {
    setSelectedLineIndices(prev => {
      if (prev[0] === null) {
        return [index, null];
      } else if (prev[1] === null) {
        return [prev[0], index];
      } else {
        return [index, null];
      }
    });
  }, []);

  const calculateAngle = useCallback((line1: Line, line2: Line) => {
    const v1 = { x: line1.x2 - line1.x1, y: line1.y2 - line1.y1 };
    const v2 = { x: line2.x2 - line2.x1, y: line2.y2 - line2.y1 };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angleRad = Math.acos(cosAngle);
    setAngle(Math.round(angleRad * (180 / Math.PI) * 100) / 100);
  }, []);

  // Calculate angle when lines are selected in auto mode
  useEffect(() => {
    if (mode === 'auto' && selectedLineIndices[0] !== null && selectedLineIndices[1] !== null) {
      const line1 = detectedLines[selectedLineIndices[0]];
      const line2 = detectedLines[selectedLineIndices[1]];
      if (line1 && line2) {
        calculateAngle(
          { x1: line1.x1, y1: line1.y1, x2: line1.x2, y2: line1.y2 },
          { x1: line2.x1, y1: line2.y1, x2: line2.x2, y2: line2.y2 }
        );
      }
    }
  }, [selectedLineIndices, mode, detectedLines, calculateAngle]);

  // Calculate angle when manual lines change
  useEffect(() => {
    if (mode === 'manual' && manualLines[0] && manualLines[1]) {
      calculateAngle(manualLines[0], manualLines[1]);
    }
  }, [manualLines, mode, calculateAngle]);

  const clearAll = useCallback(() => {
    setManualLines([null, null]);
    setSelectedLineIndices([null, null]);
    setDetectedLines([]);
    setAngle(null);
  }, []);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Set canvas size to match the displayed image size
      // We need to wait for the image to be rendered to get clientWidth/clientHeight
      requestAnimationFrame(() => {
        if (img && canvasRef.current) {
          const displayWidth = img.clientWidth;
          const displayHeight = img.clientHeight;
          setDisplaySize({ width: displayWidth, height: displayHeight });
          canvasRef.current.width = displayWidth;
          canvasRef.current.height = displayHeight;
        }
      });
    }
  }, []);

  // Update display size on window resize
  useEffect(() => {
    const updateSize = () => {
      const img = imageRef.current;
      if (img && img.naturalWidth > 0) {
        const displayWidth = img.clientWidth;
        const displayHeight = img.clientHeight;
        setDisplaySize({ width: displayWidth, height: displayHeight });
        if (canvasRef.current) {
          canvasRef.current.width = displayWidth;
          canvasRef.current.height = displayHeight;
        }
      }
    };

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Convert display coordinates to natural coordinates
  const displayToNatural = useCallback((displayX: number, displayY: number) => {
    if (displaySize.width === 0 || displaySize.height === 0) return { x: 0, y: 0 };
    return {
      x: displayX * (naturalSize.width / displaySize.width),
      y: displayY * (naturalSize.height / displaySize.height)
    };
  }, [naturalSize, displaySize]);

  // Convert natural coordinates to display coordinates
  const naturalToDisplay = useCallback((naturalX: number, naturalY: number) => {
    if (displaySize.width === 0 || displaySize.height === 0) return { x: 0, y: 0 };
    return {
      x: naturalX * (displaySize.width / naturalSize.width),
      y: naturalY * (displaySize.height / naturalSize.height)
    };
  }, [naturalSize, displaySize]);

  // Handle mouse down on canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const naturalCoords = displayToNatural(displayX, displayY);

    if (mode === 'auto') {
      // Check if clicking on an endpoint of selected lines
      const hitRadius = 20;
      for (let i = 0; i < 2; i++) {
        const lineIndex = selectedLineIndices[i];
        if (lineIndex === null || !detectedLines[lineIndex]) continue;

        const line = detectedLines[lineIndex];
        const p1 = naturalToDisplay(line.x1, line.y1);
        const p2 = naturalToDisplay(line.x2, line.y2);

        const dist1 = Math.hypot(displayX - p1.x, displayY - p1.y);
        const dist2 = Math.hypot(displayX - p2.x, displayY - p2.y);

        if (dist1 < hitRadius) {
          setDragState({ lineIndex: i as 0 | 1, endPoint: 'start' });
          return;
        } else if (dist2 < hitRadius) {
          setDragState({ lineIndex: i as 0 | 1, endPoint: 'end' });
          return;
        }
      }
      return;
    }

    if (mode === 'manual') {
      // Check if clicking on an existing endpoint
      const hitRadius = 20;
      for (let i = 0; i < 2; i++) {
        const line = manualLines[i];
        if (!line) continue;

        const p1 = naturalToDisplay(line.x1, line.y1);
        const p2 = naturalToDisplay(line.x2, line.y2);

        const dist1 = Math.hypot(displayX - p1.x, displayY - p1.y);
        const dist2 = Math.hypot(displayX - p2.x, displayY - p2.y);

        if (dist1 < hitRadius) {
          setDragState({ lineIndex: i as 0 | 1, endPoint: 'start' });
          return;
        } else if (dist2 < hitRadius) {
          setDragState({ lineIndex: i as 0 | 1, endPoint: 'end' });
          return;
        }
      }

      // Start creating a new line
      if (!manualLines[0]) {
        const newLine = { x1: naturalCoords.x, y1: naturalCoords.y, x2: naturalCoords.x, y2: naturalCoords.y };
        setManualLines([newLine, null]);
        setDragState({ lineIndex: 0, endPoint: 'end' });
      } else if (!manualLines[1]) {
        const newLine = { x1: naturalCoords.x, y1: naturalCoords.y, x2: naturalCoords.x, y2: naturalCoords.y };
        setManualLines([manualLines[0], newLine]);
        setDragState({ lineIndex: 1, endPoint: 'end' });
      } else {
        // Replace line 1
        const newLine = { x1: naturalCoords.x, y1: naturalCoords.y, x2: naturalCoords.x, y2: naturalCoords.y };
        setManualLines([newLine, null]);
        setDragState({ lineIndex: 0, endPoint: 'end' });
      }
    }
  }, [mode, manualLines, detectedLines, selectedLineIndices, displayToNatural, naturalToDisplay]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragState.lineIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const naturalCoords = displayToNatural(displayX, displayY);

    if (mode === 'manual' && dragState.lineIndex !== null) {
      setManualLines(prev => {
        const newLines = [...prev] as [Line | null, Line | null];
        if (dragState.lineIndex === null) return newLines;
        const line = newLines[dragState.lineIndex];
        if (line) {
          if (dragState.endPoint === 'start') {
            newLines[dragState.lineIndex] = { ...line, x1: naturalCoords.x, y1: naturalCoords.y };
          } else {
            newLines[dragState.lineIndex] = { ...line, x2: naturalCoords.x, y2: naturalCoords.y };
          }
        }
        return newLines;
      });
    } else if (mode === 'auto' && dragState.lineIndex !== null) {
      if (dragState.lineIndex === null) return;
      const lineIndex = selectedLineIndices[dragState.lineIndex];
      if (lineIndex === null) return;

      setDetectedLines(prev => {
        const newLines = [...prev];
        if (dragState.endPoint === 'start') {
          newLines[lineIndex] = { ...newLines[lineIndex], x1: Math.round(naturalCoords.x), y1: Math.round(naturalCoords.y) };
        } else if (dragState.endPoint === 'end') {
          newLines[lineIndex] = { ...newLines[lineIndex], x2: Math.round(naturalCoords.x), y2: Math.round(naturalCoords.y) };
        }
        return newLines;
      });
    }
  }, [dragState, mode, selectedLineIndices, displayToNatural]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragState({ lineIndex: null, endPoint: null });
  }, []);

  // Draw lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || displaySize.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toDisplay = (x: number, y: number) => {
      return naturalToDisplay(x, y);
    };

    // Draw detected lines in auto mode
    if (mode === 'auto' && detectedLines.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      detectedLines.forEach((line, index) => {
        const isHovered = hoveredLineIndex === index;
        const isSelected = selectedLineIndices.includes(index);
        const color = isSelected ? '#10B981' : isHovered ? '#F59E0B' : '#6366F1';

        const p1 = toDisplay(line.x1, line.y1);
        const p2 = toDisplay(line.x2, line.y2);

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 4 : 3;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Draw label at midpoint
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(midX, midY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letters[index], midX, midY);

        // Draw endpoints
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw drag handles for selected lines
      selectedLineIndices.forEach((lineIndex) => {
        if (lineIndex === null || !detectedLines[lineIndex]) return;
        const line = detectedLines[lineIndex];
        const p1 = toDisplay(line.x1, line.y1);
        const p2 = toDisplay(line.x2, line.y2);

        // Highlight endpoints for dragging
        ctx.fillStyle = '#00F0FF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw manual lines
    if (mode === 'manual') {
      if (manualLines[0]) {
        const p1 = toDisplay(manualLines[0].x1, manualLines[0].y1);
        const p2 = toDisplay(manualLines[0].x2, manualLines[0].y2);

        ctx.beginPath();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 4;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Midpoint label
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(midX, midY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', midX, midY);

        // Endpoints
        ctx.fillStyle = '#3B82F6';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (manualLines[1]) {
        const p1 = toDisplay(manualLines[1].x1, manualLines[1].y1);
        const p2 = toDisplay(manualLines[1].x2, manualLines[1].y2);

        ctx.beginPath();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Midpoint label
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(midX, midY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2', midX, midY);

        // Endpoints
        ctx.fillStyle = '#10B981';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [manualLines, selectedLineIndices, detectedLines, hoveredLineIndex, mode, naturalToDisplay]);

  // Handle double click to remove a line
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const hitRadius = 25;

    if (manualLines[0]) {
      const p1 = naturalToDisplay(manualLines[0].x1, manualLines[0].y1);
      const p2 = naturalToDisplay(manualLines[0].x2, manualLines[0].y2);
      const dist1 = Math.hypot(displayX - p1.x, displayY - p1.y);
      const dist2 = Math.hypot(displayX - p2.x, displayY - p2.y);
      if (dist1 < hitRadius || dist2 < hitRadius) {
        setManualLines([null, manualLines[1]]);
        return;
      }
    }

    if (manualLines[1]) {
      const p1 = naturalToDisplay(manualLines[1].x1, manualLines[1].y1);
      const p2 = naturalToDisplay(manualLines[1].x2, manualLines[1].y2);
      const dist1 = Math.hypot(displayX - p1.x, displayY - p1.y);
      const dist2 = Math.hypot(displayX - p2.x, displayY - p2.y);
      if (dist1 < hitRadius || dist2 < hitRadius) {
        setManualLines([manualLines[0], null]);
        return;
      }
    }
  }, [mode, manualLines, naturalToDisplay]);

  return (
    <div className="app-container">
      <div className="max-w-7xl mx-auto p-8">
        <header className="mb-12 text-center">
          <h1 className="title">Angle Detection</h1>
          <p className="subtitle">Draw lines on images to calculate angles between them</p>
        </header>

        <div className="main-grid">
          <div className="sidebar">
            <div className="card">
              <UploadZone onFileSelect={handleFileSelect} disabled={loading} />
            </div>

            {imageId && (
              <>
                <div className="card">
                  <ModeSwitch mode={mode} onModeChange={setMode} />
                </div>

                {mode === 'auto' && (
                  <div className="card glow-green">
                    <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      Detection Parameters
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400">Canny Low: {autoParams.canny_low}</label>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={autoParams.canny_low}
                          onChange={e => setAutoParams(p => ({ ...p, canny_low: Number(e.target.value) }))}
                          className="slider"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Canny High: {autoParams.canny_high}</label>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={autoParams.canny_high}
                          onChange={e => setAutoParams(p => ({ ...p, canny_high: Number(e.target.value) }))}
                          className="slider"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Min Line Length: {autoParams.min_line_length}</label>
                        <input
                          type="range"
                          min="20"
                          max="200"
                          value={autoParams.min_line_length}
                          onChange={e => setAutoParams(p => ({ ...p, min_line_length: Number(e.target.value) }))}
                          className="slider"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Max Line Gap: {autoParams.max_line_gap}</label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={autoParams.max_line_gap}
                          onChange={e => setAutoParams(p => ({ ...p, max_line_gap: Number(e.target.value) }))}
                          className="slider"
                        />
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          id="use-buffer"
                          checked={autoParams.use_buffer_radius}
                          onChange={e => setAutoParams(p => ({ ...p, use_buffer_radius: e.target.checked }))}
                          className="w-4 h-4 accent-cyan-400"
                        />
                        <label htmlFor="use-buffer" className="text-sm text-gray-400">Use Buffer Radius (filter duplicate lines)</label>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Buffer Radius: {autoParams.buffer_radius}</label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={autoParams.buffer_radius}
                          onChange={e => setAutoParams(p => ({ ...p, buffer_radius: Number(e.target.value) }))}
                          className="slider"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleDetectLines}
                      disabled={loading}
                      className="btn-primary w-full mt-4"
                    >
                      {loading ? 'Scanning...' : 'Scan for Lines'}
                    </button>
                  </div>
                )}

                {mode === 'manual' && (
                  <div className="card">
                    <h3 className="font-medium text-gray-700 mb-4">Instructions</h3>
                    <div className="text-sm text-gray-400 space-y-2">
                      <p>Click and drag to create lines</p>
                      <p>Drag endpoints to adjust</p>
                      <p>Double-click endpoint to remove line</p>
                    </div>
                  </div>
                )}

                <button onClick={clearAll} className="btn-secondary w-full">
                  Reset All
                </button>
              </>
            )}
          </div>

          <div className="content-area">
            {imageUrl ? (
              <div ref={containerRef} className="card image-container">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Uploaded"
                  onLoad={handleImageLoad}
                  className="uploaded-image"
                />
                <canvas
                  ref={canvasRef}
                  className="overlay-canvas"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onDoubleClick={handleCanvasDoubleClick}
                />
              </div>
            ) : (
              <div className="card text-center py-20">
                <div className="upload-placeholder">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">Upload an image to start</p>
                </div>
              </div>
            )}

            {mode === 'manual' && manualLines[0] && (
              <div className="card">
                <h3 className="font-medium text-gray-700 mb-4">Manual Lines</h3>
                <div className="space-y-2">
                  {manualLines[0] && (
                    <div className="line-info-row">
                      <span className="line-badge badge-blue">1</span>
                      <span className="text-sm text-gray-400">
                        ({Math.round(manualLines[0].x1)}, {Math.round(manualLines[0].y1)}) → ({Math.round(manualLines[0].x2)}, {Math.round(manualLines[0].y2)})
                      </span>
                    </div>
                  )}
                  {manualLines[1] && (
                    <div className="line-info-row">
                      <span className="line-badge badge-green">2</span>
                      <span className="text-sm text-gray-400">
                        ({Math.round(manualLines[1].x1)}, {Math.round(manualLines[1].y1)}) → ({Math.round(manualLines[1].x2)}, {Math.round(manualLines[1].y2)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === 'auto' && detectedLines.length > 0 && (
              <div className="card">
                <h3 className="font-medium text-gray-700 mb-4">Detected Lines - Click to select (drag cyan handles to adjust)</h3>
                <div className="detected-lines-grid">
                  {detectedLines.map((line, i) => {
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    const isSelected = selectedLineIndices.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => handleAutoLineSelect(i)}
                        onMouseEnter={() => setHoveredLineIndex(i)}
                        onMouseLeave={() => setHoveredLineIndex(null)}
                        className={`line-button ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="line-letter">{letters[i]}</span>
                        <span className="line-info">
                          ({line.x1}, {line.y1}) → ({line.x2}, {line.y2})
                        </span>
                        <span className="line-confidence">{Math.round(line.confidence * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <AngleDisplay
              angle={angle}
              line1={mode === 'manual' ? manualLines[0] : (selectedLineIndices[0] !== null ? detectedLines[selectedLineIndices[0]] : null)}
              line2={mode === 'manual' ? manualLines[1] : (selectedLineIndices[1] !== null ? detectedLines[selectedLineIndices[1]] : null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;