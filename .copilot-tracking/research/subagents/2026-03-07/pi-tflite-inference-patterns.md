---
title: Raspberry Pi TensorFlow Lite Inference Patterns
description: Research notes for quantized image inference patterns suitable for the Binsight Raspberry Pi station runtime
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - raspberry pi
  - tensorflow lite
  - tflite runtime
  - quantized models
  - image inference
estimated_reading_time: 8
---

## Research scope

Investigate Python TensorFlow Lite inference patterns suitable for Raspberry Pi for quantized image models, focused on:

* Interpreter import strategy: `tflite_runtime.interpreter` versus `tensorflow.lite.Interpreter` fallback
* Reading input and output tensor metadata, including quantization parameters and common image tensor shapes and layouts
* Safe preprocessing and postprocessing for `uint8`, `int8`, and `float32` image models
* Lightweight image decoding and resizing options
* Model asset conventions that allow swapping `.tflite` files without code changes

## Project context

* Source of truth: `spec/binsight-spec.md`
* Pi runs offline on-device inference
* Item classification is part of the live control loop
* Low-confidence predictions may fall back to an LLM path
* Current `devices/pi-station` package does not yet include TensorFlow Lite dependencies or classification implementation details

## Findings

### 1. Interpreter import strategy

For Raspberry Pi CPU inference, prefer `tflite_runtime.interpreter` first and fall back to `tensorflow.lite.Interpreter` only when the lightweight runtime is unavailable.

Why this is the pragmatic default:

* TensorFlow's Linux device quickstart explicitly documents `tflite_runtime` as the lightweight Python path for embedded inference
* TensorFlow's Raspberry Pi examples describe `tflite_runtime` as preferable when only the `Interpreter` API is needed because the full `tensorflow` package is much larger
* The fallback to `tensorflow.lite.Interpreter` preserves local development ergonomics on laptops where full TensorFlow may already be installed

Recommended import shape:

* First try `import tflite_runtime.interpreter as tflite`
* Construct with `tflite.Interpreter(...)`
* Fall back to `import tensorflow as tf` and `tf.lite.Interpreter(...)`

Important compatibility note:

* Some current upstream examples are starting to use `ai_edge_litert.interpreter` in place of `tflite_runtime`
* For this project, `tflite_runtime` remains the better near-term target because the user requested that compatibility path and it matches Raspberry Pi deployment guidance better than depending on the full TensorFlow wheel
* If the ecosystem migration to LiteRT Python packages becomes unavoidable later, treat that as a separate dependency decision rather than mixing three import paths immediately

### 2. Reading tensor metadata safely

Use `allocate_tensors()` once after interpreter creation, then read:

* `get_input_details()`
* `get_output_details()`

The TensorFlow API documents these fields per tensor detail dictionary:

* `name`
* `index`
* `shape`
* `shape_signature`
* `dtype`
* `quantization` for legacy per-tensor access
* `quantization_parameters` for scales, zero points, and quantized dimension
* `sparsity_parameters`

Implementation implications:

* Treat `shape_signature` as authoritative for dynamic shapes because unknown dimensions are encoded as `-1`
* Prefer `quantization_parameters` over `quantization` because it handles both per-tensor and per-axis cases
* For ordinary image classification models, input is usually one tensor and output is usually one logits or probability tensor, but code should still validate cardinality instead of assuming it

Common image input layouts observed in TensorFlow Lite examples:

* Most image models use NHWC: `[1, height, width, channels]`
* `channels` is usually `3`
* Width and height are typically read as `shape[2]` and `shape[1]`
* Dynamic-size models may require `resize_tensor_input()` followed by `allocate_tensors()` again

Output handling patterns:

* Plain classification models often return `[1, num_classes]`
* Raw output may be `float32`, `uint8`, or `int8`
* For integer outputs, dequantize before ranking scores if you want thresholds to mean the same thing across model variants

### 3. Safe preprocessing and postprocessing by dtype

The core rule is simple: inspect the tensor dtype and quantization parameters, then preprocess to match the model exactly instead of hardcoding MobileNet-era assumptions.

#### `float32` input models

Safe default behavior:

* Decode image to RGB
* Resize to model width and height
* Convert to `np.float32`
* Add batch dimension

Normalization:

* If the model manifest provides normalization values, use them
* If no manifest exists, the common legacy default is `(x - 127.5) / 127.5`
* Do not assume all float models use that normalization. Some expect `[0, 1]`, some expect raw `0..255`, and some bake preprocessing into the model graph

#### `uint8` input models

Safe default behavior:

* Decode to RGB
* Resize to target size
* Keep image values in `0..255`
* Convert to `np.uint8`
* Add batch dimension

Quantized preprocessing rule:

* If input quantization is approximately identity for image bytes, meaning `scale * std ≈ 1` and `mean ≈ zero_point`, raw image bytes can be copied directly
* Otherwise compute quantized input explicitly:

  `q = round((x - mean) / (std * scale) + zero_point)`

* Clip to the dtype range before casting

This mirrors the optimization used in Coral examples, where preprocessing is skipped only when the input tensor quantization already matches image byte semantics.

#### `int8` input models

Safe default behavior:

* Decode to RGB
* Resize to target size
* Start from `np.float32` image values
* Apply model normalization from manifest if present
* Quantize with tensor scale and zero point:

  `q = round(real_value / scale + zero_point)`

* Clip to `[-128, 127]`
* Cast to `np.int8`
* Add batch dimension

Why this matters:

* LiteRT quantization docs define the real-value mapping as `real_value = (quantized_value - zero_point) * scale`
* Inputs and activations for full integer models are usually per-tensor quantized
* Hardcoding `uint8` assumptions will silently corrupt `int8` model inputs

#### Output postprocessing

Recommended behavior:

* Read raw output tensor
* Remove the batch dimension only after shape validation
* If output dtype is integer, dequantize using output scale and zero point before thresholding or sorting:

  `real = scale * (q.astype(np.int64) - zero_point)`

* Rank top-k on dequantized scores
* Apply confidence thresholds on the dequantized values, not the raw integers

Practical caveat:

* Some classification models emit logits, not calibrated probabilities
* If the model metadata does not guarantee softmax probabilities, treat thresholding as model-relative rather than semantically equivalent to probability

### 4. Lightweight image decoding and resizing options

For Raspberry Pi, there are two practical paths.

#### Option A: Pillow for file-based images or simple CPU preprocessing

Use when:

* Decoding JPEG or PNG files from disk or bytes
* Simplicity matters more than squeezing the last bit of throughput
* You want a small dependency footprint compared with OpenCV

Why it works well:

* `Image.open()` is lazy, so metadata is read before full decode
* `convert('RGB')` gives a predictable channel layout
* `resize()` supports `NEAREST`, `BILINEAR`, `BICUBIC`, and `LANCZOS`
* `thumbnail()` and `resize(..., reducing_gap=...)` provide built-in downscale optimizations

Recommended resampling defaults:

* `LANCZOS` or `BICUBIC` for offline file-based classification when quality matters more than speed
* `BILINEAR` for balanced speed and quality
* `NEAREST` only when matching a training pipeline that explicitly used nearest-neighbor interpolation

#### Option B: OpenCV for camera-frame pipelines already using `cv2`

Use when:

* Frames already arrive as NumPy arrays from a camera pipeline
* You need fast resize and color conversion in one processing stack
* You are already paying the OpenCV dependency cost elsewhere

Important details:

* OpenCV camera and decode paths are usually BGR, not RGB
* Convert with `cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)` before inference unless the model was trained on BGR inputs
* `cv2.resize(..., interpolation=cv2.INTER_AREA)` is generally best for shrinking
* `cv2.INTER_LINEAR` is a good fast default for general resizing
* `cv2.INTER_CUBIC` or `cv2.INTER_LANCZOS4` are better quality but slower for enlarging

Recommendation for this project:

* If the live station inference path consumes captured frames as NumPy arrays, prefer OpenCV or the camera provider's native frame array plus NumPy for the hot path
* If the runtime classifies saved images or one-off captures from disk, Pillow is the simpler choice
* Avoid mixing Pillow and OpenCV in the same hot path unless you need one library for decode and the other for a specific transform

### 5. Model asset conventions that support swapping `.tflite` files

The runtime should not infer operational meaning from filenames alone. Use a small manifest next to the model and keep the code generic.

Recommended directory contract:

```text
devices/pi-station/models/
  active/
    model.tflite
    manifest.json
    labels.txt
    aliases.json
```

Recommended manifest fields:

* `model_path`: usually `model.tflite`, relative to the manifest directory
* `labels_path`: usually `labels.txt`
* `aliases_path`: optional label alias map such as model label to rules item id
* `input_layout`: default `nhwc`
* `color_space`: default `rgb`
* `input_width`
* `input_height`
* `input_dtype`: one of `float32`, `uint8`, `int8`
* `normalization`: object with `mean` and `std`, optional for quantized identity-input models
* `top_k`: default `3`
* `score_threshold`: model-local display threshold only
* `rules_threshold_source`: prefer `rules_preset`
* `output_type`: one of `logits` or `probabilities` when known
* `version`
* `trained_at`
* `notes`

Recommended label file format:

* Plain text, one label per line, index-aligned to output tensor positions

Recommended alias map format:

* JSON object mapping model labels to station item ids
* Example: `"aluminium can": "aluminum-can"`

Why the alias map matters here:

* The workspace already has a mismatch between collected dataset labels and rules-preset item ids
* Without an explicit alias layer, swapping models will force code changes or rules changes

Threshold ownership recommendation:

* Keep the low-confidence fallback threshold in the active rules preset because the product spec treats it as business behavior
* Keep model-specific score thresholds only for display filtering or top-k trimming, not for deciding whether to trigger LLM fallback

Swap strategy recommendation:

* Code should load only the manifest directory path, not the model path directly
* Swapping models should mean replacing the contents of `active/` or changing a single configured directory path
* Startup should validate that model, labels, aliases, and manifest agree before the station loop begins

## Evidence and references

Project-local evidence:

* `spec/binsight-spec.md` requires offline on-device Pi inference and low-confidence LLM fallback
* `devices/pi-station/README.md` states the Pi owns classification and the live control loop
* Existing repo research in `.copilot-tracking/research/subagents/2026-03-07/pi-station-ml-cv-pipeline.md` shows there is no current TFLite runtime integration and highlights current label mismatches

External evidence:

* TensorFlow `tf.lite.Interpreter` API docs document `allocate_tensors()`, `get_input_details()`, `get_output_details()`, `resize_tensor_input()`, `tensor()`, and quantization detail fields
* TensorFlow Lite Python quickstart for Linux-based devices documents `tflite_runtime` as the lightweight import path for embedded inference
* TensorFlow Raspberry Pi examples describe `tflite_runtime` as preferable when only the interpreter is needed
* TensorFlow example code for Raspberry Pi commonly reads input width and height from NHWC input tensors and falls back from lightweight runtime imports to full TensorFlow
* LiteRT quantization docs define the quantized tensor relationship and clarify integer-only versus float-I/O quantized models
* Coral examples show a robust quantized preprocessing optimization for `uint8` models and dequantized output scoring
* Pillow docs confirm lazy `Image.open()`, predictable `convert('RGB')`, and resize/filter options
* OpenCV docs recommend `INTER_AREA` for shrinking and `INTER_LINEAR` or `INTER_CUBIC` for enlarging

## Recommended defaults

For this repository, the strongest default set is:

* Use `tflite_runtime.interpreter` first, then fall back to `tensorflow.lite.Interpreter`
* Use `num_threads=4` as a starting point on Raspberry Pi 5, but benchmark `2`, `3`, and `4` because optimal threading is model-dependent
* Call `allocate_tensors()` immediately after interpreter creation
* Read input and output metadata from the interpreter, never from hardcoded assumptions
* Expect NHWC `[1, H, W, 3]` unless the manifest says otherwise
* Decode to RGB and resize to model dimensions
* For `float32` input, require manifest normalization values or explicitly record the chosen default
* For `uint8` and `int8` input, quantize using tensor metadata, not fixed constants
* Dequantize integer outputs before thresholding and top-k selection
* Use Pillow for simple file-based inference and OpenCV only when the live frame path already depends on it
* Load a manifest directory, not a naked `.tflite` file path
* Keep label aliases external in `aliases.json`
* Keep low-confidence LLM fallback threshold in rules config, not model config

## Caveats and open questions

* Upstream LiteRT Python packaging is in transition. New examples sometimes reference `ai_edge_litert` instead of `tflite_runtime`. If future Raspberry Pi packaging changes, revisit the import policy rather than layering all variants into one path now.
* Not all float models use `(x - 127.5) / 127.5`. A manifest is required if the training/export pipeline is not tightly controlled.
* Integer outputs are not always probabilities. Threshold semantics depend on whether the output is post-softmax or raw logits.
* Some models expose signatures. For plain single-input image classification, `set_tensor()` and `get_tensor()` remain simpler. If future models adopt richer signatures, reassess whether `get_signature_runner()` is a better API boundary.
* The repository's current dataset labels do not cleanly match the rules preset labels. The alias layer is not optional if model swaps are meant to be operationally safe.

## Next research

* Benchmark likely candidate models on Raspberry Pi 5 with `2`, `3`, and `4` interpreter threads
* Decide whether the runtime hot path will standardize on Pillow or OpenCV based on the actual camera frame source
* Define the exact manifest schema and validation failures for missing labels, incompatible tensor shapes, or alias gaps
* Confirm whether the intended exported classifier outputs probabilities or logits so threshold semantics are explicit