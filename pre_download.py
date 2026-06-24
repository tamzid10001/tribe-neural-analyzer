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
os.environ["MNE_DATA"] = "/app/mne_data"
os.environ["NILEARN_DATA"] = "/app/nilearn_data"
os.environ["SUBJECTS_DIR"] = "/app/mne_data"

# Create directories explicitly to prevent MNE from throwing non-existent SUBJECTS_DIR errors
os.makedirs("/app/cache", exist_ok=True)
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
    # This will load model, download best.ckpt and config.yaml, and instantiate feature extractors
    model = TribeModel.from_pretrained("facebook/tribev2", cache_folder="/app/cache")
    print("TRIBE v2 model and weights loaded & cached successfully.")
except Exception as e:
    print(f"Error downloading TRIBE v2 weights/model: {e}", file=sys.stderr)
    sys.exit(1)

print("=== Pre-download & Caching Stage Completed Successfully ===")
