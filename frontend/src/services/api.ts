import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export interface DetectedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
}

export interface UploadResponse {
  image_id: string;
  filename: string;
}

export interface DetectLinesResponse {
  image_id: string;
  lines: DetectedLine[];
}

export interface CalculateAngleResponse {
  angle: number;
  line1: { x1: number; y1: number; x2: number; y2: number };
  line2: { x1: number; y1: number; x2: number; y2: number };
}

export const api = {
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE}/api/v1/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  detectLines: async (
    imageId: string,
    params: { canny_low?: number; canny_high?: number; min_line_length?: number; max_line_gap?: number } = {}
  ): Promise<DetectLinesResponse> => {
    const response = await axios.post(`${API_BASE}/api/v1/detect-lines`, {
      image_id: imageId,
      ...params,
    });
    return response.data;
  },

  calculateAngle: async (
    line1: { x1: number; y1: number; x2: number; y2: number },
    line2: { x1: number; y1: number; x2: number; y2: number }
  ): Promise<CalculateAngleResponse> => {
    const response = await axios.post(`${API_BASE}/api/v1/calculate-angle`, {
      line1,
      line2,
    });
    return response.data;
  },

  getImageUrl: (imageId: string): string => {
    return `${API_BASE}/api/v1/image/${imageId}`;
  },

  deleteImage: async (imageId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/api/v1/image/${imageId}`);
  },
};