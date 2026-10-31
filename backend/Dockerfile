FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies for OpenCV and video/image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy backend source code and YOLO weights
COPY . .

# Set default port
ENV PORT=8001
EXPOSE 8001

# Launch FastAPI Uvicorn server
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
