set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
	@just --list

bootstrap:
	@if [ -f package.json ]; then corepack pnpm install; else echo "TypeScript workspace is not bootstrapped yet."; fi

check:
	@if [ -f package.json ]; then corepack pnpm lint && corepack pnpm build; else echo "TypeScript workspace is not bootstrapped yet."; fi

web:
	@if [ -f apps/web/package.json ]; then cd apps/web && corepack pnpm run dev; else echo "apps/web is not bootstrapped yet."; fi

web-local:
	@if [ -f package.json ]; then corepack pnpm run web:dev; else echo "TypeScript workspace is not bootstrapped yet."; fi

rehearsal-web-local: web-local

backend:
	@if [ -f services/backend-functions/package.json ]; then cd services/backend-functions && corepack pnpm run dev; else echo "services/backend-functions is not bootstrapped yet."; fi

backend-build:
	@if [ -f package.json ]; then corepack pnpm run backend:build; else echo "TypeScript workspace is not bootstrapped yet."; fi

rehearsal-build-backend: backend-build

firebase-firestore-deploy:
	@if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then echo "Set FIREBASE_PROJECT_ID before running this task."; exit 1; fi
	@if [ -f package.json ]; then corepack pnpm run firebase:deploy:firestore; else echo "TypeScript workspace is not bootstrapped yet."; fi

rehearsal-deploy-firestore: firebase-firestore-deploy

firebase-functions-deploy:
	@if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then echo "Set FIREBASE_PROJECT_ID before running this task."; exit 1; fi
	@if [ -f package.json ]; then corepack pnpm run firebase:deploy:functions; else echo "TypeScript workspace is not bootstrapped yet."; fi

rehearsal-deploy-functions: firebase-functions-deploy

seed-demo:
	@if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then echo "Set FIREBASE_PROJECT_ID before seeding demo data."; exit 1; fi
	@if [ -z "${BINSIGHT_STORAGE_BUCKET:-}" ]; then echo "Set BINSIGHT_STORAGE_BUCKET before seeding demo data."; exit 1; fi
	@if [ -z "${BINSIGHT_DEVICE_CREDENTIALS_JSON:-}" ]; then echo "Set BINSIGHT_DEVICE_CREDENTIALS_JSON before seeding demo data."; exit 1; fi
	@if [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then echo "Set GOOGLE_APPLICATION_CREDENTIALS before seeding demo data."; exit 1; fi
	@if [ -f package.json ]; then corepack pnpm run backend:seed:demo; else echo "TypeScript workspace is not bootstrapped yet."; fi

rehearsal-seed-demo: seed-demo

pi:
	@if [ -f devices/pi-station/pyproject.toml ]; then cd devices/pi-station && uv run binsight-station; else echo "devices/pi-station is not bootstrapped yet."; fi

rehearsal-pi-start: pi

rehearsal-pi-validate:
	@if [ -f devices/pi-station/pyproject.toml ]; then cd devices/pi-station && uv run pytest; else echo "devices/pi-station is not bootstrapped yet."; fi

firmware:
	@if [ -f firmware/esp8266-controller/platformio.ini ]; then repo_root="$PWD"; if [ -x "$repo_root/.venv/bin/pio" ]; then cd firmware/esp8266-controller && "$repo_root/.venv/bin/pio" run; elif command -v pio >/dev/null 2>&1; then cd firmware/esp8266-controller && "$(command -v pio)" run; else echo "PlatformIO is not available. Install it globally or provide .venv/bin/pio in the workspace root."; exit 1; fi; else echo "firmware/esp8266-controller is not bootstrapped yet."; fi

validate:
	@if [ -f package.json ]; then corepack pnpm lint && corepack pnpm build && corepack pnpm test; else echo "TypeScript workspace is not bootstrapped yet."; exit 1; fi
	@if [ -f devices/pi-station/pyproject.toml ]; then cd devices/pi-station && uv run pytest; else echo "devices/pi-station is not bootstrapped yet."; exit 1; fi
	@if [ -f firmware/esp8266-controller/platformio.ini ]; then repo_root="$PWD"; if [ -x "$repo_root/.venv/bin/pio" ]; then cd firmware/esp8266-controller && "$repo_root/.venv/bin/pio" run; elif command -v pio >/dev/null 2>&1; then cd firmware/esp8266-controller && "$(command -v pio)" run; else echo "PlatformIO is not available. Install it globally or provide .venv/bin/pio in the workspace root."; exit 1; fi; else echo "firmware/esp8266-controller is not bootstrapped yet."; exit 1; fi
