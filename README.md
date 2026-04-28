# Angle Detection - Docker Deployment

Run the Angle Detection webapp in a Docker container on your home server.

## Quick Start

```bash
# Build and run the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The app will be available at `http://YOUR_SERVER_IP:8000`

## Prerequisites

- Docker installed on your home server
- Docker Compose (usually included with Docker Desktop)

## Data Persistence

Uploaded images are stored in a Docker volume called `angle-uploads`. This ensures your images persist even if the container is recreated.

## Updating

```bash
# Pull latest code and rebuild
git pull origin main
docker-compose up -d --build
```

## Troubleshooting

**Port already in use?**
Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Access at http://YOUR_SERVER_IP:8080
```

**View container logs:**
```bash
docker-compose logs -f angle-detection
```

**Rebuild from scratch:**
```bash
docker-compose down -v --rmi local
docker-compose up -d --build
```
