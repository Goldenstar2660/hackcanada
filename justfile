set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
	@just --list

bootstrap:
	@if [ -f package.json ]; then corepack pnpm install; else echo "TypeScript workspace is not bootstrapped yet."; fi

check:
	@if [ -f package.json ]; then corepack pnpm lint && corepack pnpm build; else echo "TypeScript workspace is not bootstrapped yet."; fi

web:
	@if [ -f apps/web/package.json ]; then cd apps/web && corepack pnpm run dev; else echo "apps/web is not bootstrapped yet."; fi

backend:
	@if [ -f services/backend-functions/package.json ]; then cd services/backend-functions && corepack pnpm run dev; else echo "services/backend-functions is not bootstrapped yet."; fi

pi:
	@if [ -f devices/pi-station/pyproject.toml ]; then cd devices/pi-station && uv run python -m binbuddy_station.main; else echo "devices/pi-station is not bootstrapped yet."; fi

firmware:
	@if [ -f firmware/esp8266-controller/platformio.ini ]; then repo_root="$PWD"; if [ -x "$repo_root/.venv/bin/pio" ]; then cd firmware/esp8266-controller && "$repo_root/.venv/bin/pio" run; elif command -v pio >/dev/null 2>&1; then cd firmware/esp8266-controller && "$(command -v pio)" run; else echo "PlatformIO is not available. Install it globally or provide .venv/bin/pio in the workspace root."; exit 1; fi; else echo "firmware/esp8266-controller is not bootstrapped yet."; fi

validate:
	@if [ -f package.json ]; then corepack pnpm lint && corepack pnpm build && corepack pnpm test; else echo "TypeScript workspace is not bootstrapped yet."; exit 1; fi
	@if [ -f devices/pi-station/pyproject.toml ]; then cd devices/pi-station && uv run pytest; else echo "devices/pi-station is not bootstrapped yet."; exit 1; fi
	@if [ -f firmware/esp8266-controller/platformio.ini ]; then repo_root="$PWD"; if [ -x "$repo_root/.venv/bin/pio" ]; then cd firmware/esp8266-controller && "$repo_root/.venv/bin/pio" run; elif command -v pio >/dev/null 2>&1; then cd firmware/esp8266-controller && "$(command -v pio)" run; else echo "PlatformIO is not available. Install it globally or provide .venv/bin/pio in the workspace root."; exit 1; fi; else echo "firmware/esp8266-controller is not bootstrapped yet."; exit 1; fi
