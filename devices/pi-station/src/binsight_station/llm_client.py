from __future__ import annotations

import base64
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from google.genai import types


logger = logging.getLogger(__name__)


class LLMClassificationError(Exception):
    pass


class LLMAPIError(LLMClassificationError):
    pass


class LLMTimeoutError(LLMClassificationError):
    pass


class LLMResponseError(LLMClassificationError):
    pass


@dataclass(frozen=True)
class LLMClientConfig:
    api_key: str
    model: str = "gemini-2.0-flash"
    timeout_seconds: float = 10.0


class LLMClient:
    def __init__(
        self,
        config: LLMClientConfig,
        valid_labels: Sequence[str] | None = None,
    ) -> None:
        self._config = config
        self._valid_labels = frozenset(label.lower() for label in (valid_labels or ()))
        self._client = self._create_client()

    def _create_client(self):
        try:
            from google import genai
        except ImportError:
            raise LLMClassificationError(
                "google-genai is not installed. Install with: pip install google-genai"
            )
        return genai.Client(api_key=self._config.api_key)

    def classify_image(self, image_path: Path) -> str:
        try:
            return self._classify_with_retry(image_path)
        except Exception as e:
            logger.warning("LLM classification failed: %s", e)
            raise

    def _classify_with_retry(self, image_path: Path) -> str:
        import time

        max_retries = 2
        last_error = None

        for attempt in range(max_retries):
            try:
                return self._call_gemini(image_path)
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = 0.5 * (2 ** attempt)
                    logger.warning(
                        "LLM API attempt %d failed, retrying in %.1fs: %s",
                        attempt + 1,
                        wait_time,
                        e,
                    )
                    time.sleep(wait_time)

        raise last_error

    def _call_gemini(self, image_path: Path) -> str:
        try:
            import httpx
        except ImportError:
            raise LLMClassificationError("httpx is required for Gemini API calls")

        image_bytes = image_path.read_bytes()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = self._build_prompt()

        try:
            response = self._client.models.generate_content(
                model=self._config.model,
                contents=[
                    types.Content(
                        parts=[
                            types.Part(text=prompt),
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=self._infer_mime_type(image_path),
                                    data=image_bytes,
                                )
                            ),
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=64,
                ),
            )
        except httpx.ReadTimeout as e:
            raise LLMTimeoutError(f"Gemini API timed out after {self._config.timeout_seconds}s") from e
        except httpx.HTTPStatusError as e:
            raise LLMAPIError(f"Gemini API returned error {e.response.status_code}: {e.response.text}") from e
        except Exception as e:
            if "timeout" in str(e).lower():
                raise LLMTimeoutError(f"Gemini API timed out: {e}") from e
            raise LLMAPIError(f"Gemini API call failed: {e}") from e

        if not response.candidates:
            raise LLMResponseError("Gemini response has no candidates")

        candidate = response.candidates[0]
        if not candidate.content or not candidate.content.parts:
            raise LLMResponseError("Gemini response has no content parts")

        text_response = candidate.content.parts[0].text.strip()
        return self._parse_response(text_response)

    def _build_prompt(self) -> str:
        valid_items = ""
        if self._valid_labels:
            items_list = ", ".join(sorted(self._valid_labels))
            valid_items = (
                f" The item must be one of these categories: {items_list}. "
                "If the item doesn't match any category, respond with 'unknown-item'."
            )

        return (
            "You are a waste-sorting assistant for a smart recycling station. "
            "Look at the image and identify the item being held. "
            "Respond with just the item name, nothing else."
            f"{valid_items}"
            " Examples: plastic-bottle, cardboard-box, apple-core, soda-can, paper-cup."
        )

    def _parse_response(self, text: str) -> str:
        text = text.strip()

        text = re.sub(r"^['\"]+|['\"]+$", "", text)

        normalized = self._normalize_label(text)

        if self._valid_labels and normalized not in self._valid_labels:
            closest = self._find_closest_match(normalized)
            if closest:
                logger.info("LLM returned '%s', matched to known label '%s'", normalized, closest)
                return closest
            logger.warning("LLM returned '%s' which is not in valid labels, using as-is", normalized)
            return normalized

        return normalized

    def _normalize_label(self, label: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", label.strip().lower())
        normalized = re.sub(r"-+", "-", normalized)
        return normalized.strip("-") or "unknown-item"

    def _find_closest_match(self, label: str) -> str | None:
        if not self._valid_labels:
            return None

        for valid in self._valid_labels:
            if label == valid:
                return valid
            if label in valid or valid in label:
                return valid

        return None

    def _infer_mime_type(self, path: Path) -> str:
        suffix = path.suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        return mime_types.get(suffix, "image/jpeg")
