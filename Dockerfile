FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Copy entire project
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Move build to backend static location
WORKDIR /app
RUN mkdir -p /app/backend/app/static
RUN mv /app/frontend/dist /app/backend/app/static/

# Install Python dependencies (from backend folder)
RUN pip install --no-cache-dir -r backend/requirements.txt

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]