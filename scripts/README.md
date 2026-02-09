# Scripts Directory

Utility scripts for development, testing, and deployment of the Smart Home IoT project.

## Available Scripts

### Development Setup

**`setup-dev-env.sh`** - Complete development environment setup
```bash
./scripts/setup-dev-env.sh
```

This script:
- Checks for required dependencies (Python, Node.js, Docker)
- Sets up Python virtual environment
- Installs backend dependencies
- Installs frontend dependencies
- Creates environment configuration files
- Starts Docker containers (Redis, TimescaleDB)
- Generates SSL certificates
- Optionally sets up firmware development tools

### Testing

**`run-tests.sh`** - Unified test runner for all components
```bash
# Run all tests
./scripts/run-tests.sh

# Run specific tests
./scripts/run-tests.sh --backend-only
./scripts/run-tests.sh --frontend-only
./scripts/run-tests.sh --firmware-only

# Run with coverage
./scripts/run-tests.sh --coverage

# Verbose output
./scripts/run-tests.sh --verbose
```

Options:
- `--backend-only` - Run only backend Python tests
- `--frontend-only` - Run only frontend React tests
- `--firmware-only` - Run only firmware unit tests
- `--coverage`, `-c` - Generate coverage reports
- `--verbose`, `-v` - Show detailed output
- `--help`, `-h` - Show help message

## Script Permissions

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

## Prerequisites

### For setup-dev-env.sh
- Python 3.8+
- Node.js 16+
- Docker and Docker Compose (optional)
- PlatformIO CLI (optional, for firmware)

### For run-tests.sh
- Pytest (Python testing)
- Jest (via npm, for React testing)
- PlatformIO (optional, for firmware tests)

## CI/CD Integration

These scripts are designed to work in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Setup environment
  run: ./scripts/setup-dev-env.sh

- name: Run tests
  run: ./scripts/run-tests.sh --coverage
```

## Troubleshooting

**Permission denied errors:**
```bash
chmod +x scripts/*.sh
```

**Python virtual environment issues:**
```bash
rm -rf backend/venv
./scripts/setup-dev-env.sh
```

**Docker not starting:**
```bash
# Check Docker service
sudo systemctl status docker

# Restart containers
cd infrastructure
docker-compose down
docker-compose up -d
```

**Node modules issues:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Adding New Scripts

When adding new scripts:
1. Add descriptive header comments
2. Use `set -e` for error handling
3. Add usage/help information
4. Make executable with `chmod +x`
5. Update this README
6. Test on clean environment

## Environment Variables

Scripts respect these environment variables:
- `PYTHON_VERSION` - Specify Python version
- `NODE_VERSION` - Specify Node.js version
- `SKIP_DOCKER` - Skip Docker setup
- `SKIP_CERTS` - Skip certificate generation

Example:
```bash
SKIP_DOCKER=1 ./scripts/setup-dev-env.sh
```
