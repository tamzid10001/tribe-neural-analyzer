#!/usr/bin/env python3
"""
Pre-download script to cache all heavy machine learning weights, fsaverage5 surface meshes,
and HCP parcellations into the Docker container during the build stage.
This prevents runtime download delays and cold-starts on Google Cloud Run.
"""
import os
import sys

# Ensure caching dirs are set to /app paths
os.environ["HF_HOME"] = "/app/cache"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/app/cache/hub"
os.environ["TRANSFORMERS_CACHE"] = "/app/cache/hub"
os.environ["WHISPER_CACHE"] = "/app/cache/whisper"
os.environ["MNE_DATA"] = "/app/mne_data"
os.environ["NILEARN_DATA"] = "/app/nilearn_data"
os.environ["SUBJECTS_DIR"] = "/app/mne_data"
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

# Create directories explicitly to prevent MNE from throwing non-existent SUBJECTS_DIR errors
os.makedirs("/app/cache", exist_ok=True)
os.makedirs("/app/cache/hub", exist_ok=True)
os.makedirs("/app/cache/whisper", exist_ok=True)
os.makedirs("/app/mne_data", exist_ok=True)
os.makedirs("/app/nilearn_data", exist_ok=True)


print("=== Starting Pre-download & Caching Stage ===")

try:
    print("1. Fetching Nilearn fsaverage5 surface mesh...")
    from nilearn import datasets
    datasets.fetch_surf_fsaverage("fsaverage5")
    print("Nilearn fsaverage5 downloaded successfully.")
except Exception as e:
    print(f"Error downloading Nilearn dataset: {e}", file=sys.stderr)
    sys.exit(1)

try:
    print("2. Fetching MNE fsaverage templates & HCP MMP 1.0 parcellation...")
    import mne
    mne.datasets.fetch_fsaverage(subjects_dir="/app/mne_data", verbose=True)
    mne.datasets.fetch_hcp_mmp_parcellation(accept=True, verbose=True)
    print("MNE HCP parcellation downloaded successfully.")
except Exception as e:
    print(f"Error downloading MNE dataset: {e}", file=sys.stderr)
    sys.exit(1)

try:
    print("3. Loading TRIBE v2 model & pre-downloading model weights...")
    from tribev2 import TribeModel
    import torch

    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
    device = "cpu"
    config_update = {
        "data.text_feature.device": device,
        "data.audio_feature.device": device,
        "data.video_feature.image.device": device,
        "data.image_feature.image.device": device,
        "data.text_feature.infra.cluster": "processpool",
        "data.audio_feature.infra.cluster": "processpool",
        "data.video_feature.infra.cluster": "processpool",
        "data.text_feature.infra.gpus_per_node": 0,
        "data.audio_feature.infra.gpus_per_node": 0,
        "data.video_feature.infra.gpus_per_node": 0,
        "data.video_feature.image.infra.gpus_per_node": 0,
        "data.image_feature.image.infra.gpus_per_node": 0,
    }
    # This will load model, download best.ckpt and config.yaml, and instantiate feature extractors
    model = TribeModel.from_pretrained(
        "facebook/tribev2",
        cache_folder="/app/cache",
        device=device,
        cluster="processpool",
        config_update=config_update,
    )
    print("TRIBE v2 model and weights loaded & cached successfully.")
except Exception as e:
    print(f"Error downloading TRIBE v2 weights/model: {e}", file=sys.stderr)
    sys.exit(1)

try:
    print("4. Pre-downloading WhisperX / faster-whisper models...")
    from huggingface_hub import snapshot_download

    hf_token = os.environ.get("HF_TOKEN") or None
    whisper_cache = "/app/cache/whisper"
    hub_cache = "/app/cache/hub"
    for repo_id in (
        "Systran/faster-whisper-large-v3",
        "Systran/faster-whisper-large-v3-turbo",
    ):
        try:
            snapshot_download(
                repo_id=repo_id,
                cache_dir=hub_cache,
                token=hf_token,
            )
            print(f"Cached {repo_id}")
        except Exception as repo_err:
            print(f"Warning: could not cache {repo_id}: {repo_err}", file=sys.stderr)

    import torchaudio
    torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H.get_model()
    print("Cached wav2vec2 alignment model.")

    import subprocess
    import struct
    import wave
    import whisperx

    silent_wav = "/tmp/whisper_warmup.wav"
    with wave.open(silent_wav, "w") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(16000)
        handle.writeframes(struct.pack("<h", 0) * 16000)

    hf_token = os.environ.get("HF_TOKEN") or None
    model = whisperx.load_model(
        "large-v3",
        device="cpu",
        compute_type="float32",
        vad_method="silero",
        download_root=whisper_cache,
        local_files_only=False,
        use_auth_token=hf_token,
    )
    audio = whisperx.load_audio(silent_wav)
    model.transcribe(audio, batch_size=1, language="en")
    print("WhisperX in-process warmup completed.")
except Exception as e:
    print(f"Error pre-downloading WhisperX models: {e}", file=sys.stderr)
    sys.exit(1)

print("=== Pre-download & Caching Stage Completed Successfully ===")
