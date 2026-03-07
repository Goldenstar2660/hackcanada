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
	@if [ -f firmware/esp8266-controller/platformio.ini ]; then cd firmware/esp8266-controller && pio run; else echo "firmware/esp8266-controller is not bootstrapped yet."; fi

validate:
	@if [ -f package.json ]; then corepack pnpm lint && corepack pnpm build; else echo "TypeScript workspace is not bootstrapped yet."; fi