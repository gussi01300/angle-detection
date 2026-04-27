import numpy as np


def calculate_angle(x1: float, y1: float, x2: float, y2: float,
                    x3: float, y3: float, x4: float, y4: float) -> float:
    """
    Calculate the angle between two lines in degrees.

    Args:
        Line 1: (x1, y1) to (x2, y2)
        Line 2: (x3, y3) to (x4, y4)

    Returns:
        Angle in degrees (0-180)
    """
    # Direction vectors
    v1 = np.array([x2 - x1, y2 - y1])
    v2 = np.array([x4 - x3, y4 - y3])

    # Normalize
    v1_norm = np.linalg.norm(v1)
    v2_norm = np.linalg.norm(v2)

    if v1_norm == 0 or v2_norm == 0:
        return 0.0

    v1 = v1 / v1_norm
    v2 = v2 / v2_norm

    # Dot product
    dot = np.clip(np.dot(v1, v2), -1.0, 1.0)

    # Angle in radians then degrees
    angle_rad = np.arccos(dot)
    angle_deg = np.degrees(angle_rad)

    return round(angle_deg, 2)