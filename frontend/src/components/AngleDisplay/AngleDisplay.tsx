interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface AngleDisplayProps {
  angle: number | null;
  line1: Line | null;
  line2: Line | null;
}

export function AngleDisplay({ angle, line1, line2 }: AngleDisplayProps) {
  if (angle === null) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <div className="text-gray-500 text-lg">Draw two lines to calculate angle</div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-5xl font-bold text-blue-600">{angle}°</div>
        <div className="text-gray-600 mt-2">Angle between lines</div>
      </div>
      {line1 && line2 && (
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <div>Line 1: ({line1.x1}, {line1.y1}) → ({line1.x2}, {line1.y2})</div>
          <div>Line 2: ({line2.x1}, {line2.y1}) → ({line2.x2}, {line2.y2})</div>
        </div>
      )}
    </div>
  );
}