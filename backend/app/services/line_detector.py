import cv2
import numpy as np
from typing import List, Dict, Any


def detect_lines(image_path: str,
                 canny_low: int = 50,
                 canny_high: int = 150,
                 min_line_length: int = 50,
                 max_line_gap: int = 20,
                 buffer_radius: int = 5) -> List[Dict[str, Any]]:
    """
    Detect lines in an image using Canny edge detection and Hough Transform.

    Args:
        image_path: Path to the image file
        canny_low: Lower threshold for Canny edge detection
        canny_high: Upper threshold for Canny edge detection
        min_line_length: Minimum length of a detected line
        max_line_gap: Maximum gap between points to still form a line
        buffer_radius: Lines close to existing lines with similar angle are filtered out

    Returns:
        List of detected lines with endpoints and confidence
    """
    # Read image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Canny edge detection
    edges = cv2.Canny(blurred, canny_low, canny_high)

    # Hough Transform - Probabilistic method
    lines = cv2.HoughLinesP(edges,
                            rho=1,
                            theta=np.pi / 180,
                            threshold=50,
                            minLineLength=min_line_length,
                            maxLineGap=max_line_gap)

    result = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Calculate confidence based on line length
            length = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            confidence = min(length / 200, 1.0)  # Normalize to 0-1

            result.append({
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2),
                "confidence": round(confidence, 3)
            })

    # Sort by line length (longest first)
    result.sort(key=lambda l: np.sqrt((l["x2"] - l["x1"])**2 + (l["y2"] - l["y1"])**2), reverse=True)

    # Filter out lines that are too close AND have similar angle (likely same object)
    if buffer_radius > 0:
        filtered = []
        for line in result:
            should_filter = False
            for kept_line in filtered:
                # Check if lines are close AND have similar angle
                dist = min(
                    point_to_line_distance(line["x1"], line["y1"], kept_line["x1"], kept_line["y1"], kept_line["x2"], kept_line["y2"]),
                    point_to_line_distance(line["x2"], line["y2"], kept_line["x1"], kept_line["y1"], kept_line["x2"], kept_line["y2"]),
                    point_to_line_distance(kept_line["x1"], kept_line["y1"], line["x1"], line["y1"], line["x2"], line["y2"]),
                    point_to_line_distance(kept_line["x2"], kept_line["y2"], line["x1"], line["y1"], line["x2"], line["y2"])
                )

                if dist < buffer_radius:
                    # Lines are close - check if angles are similar (within 15 degrees)
                    angle_diff = angle_between_lines(line, kept_line)
                    if angle_diff < 15:  # Less than 15 degrees difference
                        should_filter = True
                        break

            if not should_filter:
                filtered.append(line)
        result = filtered

    return result


def point_to_line_distance(px: int, py: int, x1: int, y1: int, x2: int, y2: int) -> float:
    """Calculate the minimum distance from a point to a line segment."""
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return np.sqrt((px - x1) ** 2 + (py - y1) ** 2)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return np.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)


def angle_between_lines(line1: Dict[str, Any], line2: Dict[str, Any]) -> float:
    """Calculate the angle between two lines in degrees (0-90)."""
    # Get direction vectors
    v1 = np.array([line1["x2"] - line1["x1"], line1["y2"] - line1["y1"]], dtype=float)
    v2 = np.array([line2["x2"] - line2["x1"], line2["y2"] - line2["y1"]], dtype=float)

    # Normalize
    v1 = v1 / np.linalg.norm(v1)
    v2 = v2 / np.linalg.norm(v2)

    # Calculate angle using dot product
    dot = np.clip(np.dot(v1, v2), -1.0, 1.0)
    angle_rad = np.arccos(dot)

    # Return angle in degrees (0-90, since we use absolute value)
    return np.degrees(np.abs(angle_rad))
