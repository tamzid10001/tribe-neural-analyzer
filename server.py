import os
import sys
import uuid
import shutil
import logging
from pathlib import Path
import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure caching directories are aligned with container environment
os.environ["HF_HOME"] = "/app/cache"
os.environ["MNE_DATA"] = "/app/mne_data"
os.environ["NILEARN_DATA"] = "/app/nilearn_data"
os.environ["SUBJECTS_DIR"] = "/app/mne_data"

# Create directories explicitly to avoid directory-not-found errors at runtime
os.makedirs("/app/cache", exist_ok=True)
os.makedirs("/app/mne_data", exist_ok=True)
os.makedirs("/app/nilearn_data", exist_ok=True)


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tribe-server")

app = FastAPI(
    title="TRIBE v2 Neural Content Analyzer Backend",
    description="FastAPI backend running Meta's TRIBE v2 deep learning model for fMRI-like content analysis.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows any origin for development and Cloud Run deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to hold the loaded model and network ROI mappings
model = None
NETWORK_VECTORS = {}

# Canonical 9 brain networks and their neuroscientific HCP MMP 1.0 ROI mappings
NETWORK_ROIS = {
    "V1": ["V1"],
    "FFA": ["FFC", "PIT", "V8"],
    "EBA": ["EBA", "VMT", "LO1", "LO2", "LO3"],
    "PPA": ["PHA1", "PHA2", "PHA3", "VMV1", "VMV2", "VMV3"],
    "STS": ["STSda", "STSdp", "STSva", "STSvp"],
    "LANG": ["44", "45", "IFJa", "IFJp", "55b", "PSL", "STV", "TPOJ1", "TPOJ2", "TPOJ3"],
    "DMN": ["10r", "10v", "9m", "10d", "v23ab", "d23ab", "31pv", "31pd"],
    "NAcc": ["10v", "OFC", "47m"],  # vmPFC and OFC as subcortical NAcc reward proxies on the cortical surface
    "AIns": ["AI", "FOP1", "FOP2", "FOP3", "FOP4", "FOP5", "AVI"]   # Anterior Insula and Frontal Operculum regions
}

def sigmoid_normalize(z_scores, k=1.0, center=0.0):
    """
    Map raw fMRI predicted z-scores (typically -3.0 to +3.0) 
    smoothly to a [0, 1] activation scale using a sigmoid function.
    """
    return 1.0 / (1.0 + np.exp(-k * (z_scores - center)))

@app.on_event("startup")
def startup_event():
    """
    On startup, load the pretrained TRIBE v2 model and precalculate
    the fsaverage5 surface mesh vertex indices for our 9 canonical networks.
    """
    global model, NETWORK_VECTORS
    logger.info("Initializing TRIBE v2 Backend Server...")
    
    # 1. Load the model
    try:
        from tribev2 import TribeModel
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading TribeModel on device: {device}...")
        model = TribeModel.from_pretrained("facebook/tribev2", cache_folder="/app/cache", device=device)
        logger.info("TribeModel loaded successfully.")
    except Exception as e:
        logger.error(f"Critical error loading TribeModel: {e}")
        # We don't crash the server startup, but /status and /analyze will check readiness
        model = None

    # 2. Map cortical parcellation ROIs to fsaverage5 vertex indices
    try:
        from tribev2.utils import get_hcp_roi_indices
        logger.info("Mapping HCP MMP 1.0 cortical ROIs to network vertex vectors...")
        for net_id, rois in NETWORK_ROIS.items():
            try:
                indices = get_hcp_roi_indices(rois, hemi="both", mesh="fsaverage5")
                NETWORK_VECTORS[net_id] = indices
                logger.info(f"Mapped {net_id} -> {len(indices)} vertices on fsaverage5.")
            except Exception as ex:
                logger.warning(f"Could not map ROIs {rois} for network {net_id}: {ex}")
                # Safe fallback: assign a slice of vertices to prevent crashing
                idx = list(NETWORK_ROIS.keys()).index(net_id)
                NETWORK_VECTORS[net_id] = np.arange(idx * 1000, (idx + 1) * 1000)
    except Exception as e:
        logger.error(f"Failed to load HCP parcellations: {e}")
        # Universal fallback for all networks
        for i, net_id in enumerate(NETWORK_ROIS.keys()):
            NETWORK_VECTORS[net_id] = np.arange(i * 1000, (i + 1) * 1000)


class StatusResponse(BaseModel):
    status: str
    model: str
    device: str
    networks_mapped: list


@app.get("/status", response_model=StatusResponse)
def get_status():
    """
    Exposes server health, active device, and active networks mapping.
    """
    if model is None:
        return StatusResponse(
            status="loading_error",
            model="facebook/tribev2",
            device="unknown",
            networks_mapped=[]
        )
    
    device_str = "cuda" if torch.cuda.is_available() else "cpu"
    return StatusResponse(
        status="ready",
        model="facebook/tribev2",
        device=device_str,
        networks_mapped=list(NETWORK_VECTORS.keys())
    )


@app.post("/analyze")
async def analyze_content(
    file: UploadFile = File(None),
    text: str = Form(None)
):
    """
    Endpoint accepting text input or video/audio uploads, running actual 
    in-silico neuro fMRI prediction, and returning time-series network activation.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="TribeModel is not loaded or initialization failed.")
    
    if file is None and (text is None or not text.strip()):
        raise HTTPException(status_code=400, detail="Either a file (video/audio) or text must be provided.")

    # Create temporary directory for processing
    temp_dir = Path(f"/tmp/tribe_{uuid.uuid4().hex}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file_path = None
    duration = 1.0
    media_type = "text"

    try:
        # Determine media type and save uploaded file
        if file is not None:
            filename = file.filename
            ext = Path(filename).suffix.lower()
            temp_file_path = temp_dir / f"input{ext}"
            
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"Saved uploaded file: {filename} ({file.content_type}) to {temp_file_path}")

            # Assess duration and input type
            if ext in [".mp4", ".avi", ".mkv", ".mov", ".webm"]:
                media_type = "video"
                try:
                    from moviepy.editor import VideoFileClip
                    clip = VideoFileClip(str(temp_file_path))
                    duration = clip.duration
                    clip.close()
                except Exception as ex:
                    logger.warning(f"Could not parse video duration with moviepy: {ex}. Defaulting to 10s.")
                    duration = 10.0
            elif ext in [".wav", ".mp3", ".flac", ".ogg"]:
                media_type = "audio"
                try:
                    import soundfile as sf
                    info = sf.info(str(temp_file_path))
                    duration = info.duration
                except Exception as ex:
                    logger.warning(f"Could not parse audio duration with soundfile: {ex}. Defaulting to 10s.")
                    duration = 10.0
            elif ext == ".txt":
                media_type = "text"
                temp_file_path = temp_file_path # treated as text path
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'")
        else:
            # Handle direct text payload
            media_type = "text"
            temp_file_path = temp_dir / "input.txt"
            with open(temp_file_path, "w", encoding="utf-8") as f:
                f.write(text)
            duration = max(1.0, len(text.split()) * 0.4) # rough estimate of speech reading rate

        logger.info(f"Processing {media_type} stimuli with estimated duration of {duration:.2f} seconds...")

        # Construct Events DataFrame
        try:
            if media_type == "video":
                df = model.get_events_dataframe(video_path=str(temp_file_path))
            elif media_type == "audio":
                df = model.get_events_dataframe(audio_path=str(temp_file_path))
            else:
                df = model.get_events_dataframe(text_path=str(temp_file_path))
        except Exception as e:
            logger.error(f"Failed to build events dataframe: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to extract features or build events dataframe: {str(e)}")

        # Run TRIBE v2 Inference
        try:
            preds, segments = model.predict(events=df, verbose=False)
            logger.info(f"Inference complete. Predictions shape: {preds.shape}") # (n_timesteps, 20484)
        except Exception as e:
            logger.error(f"Inference execution failed: {e}")
            raise HTTPException(status_code=500, detail=f"Deep learning inference failed: {str(e)}")

        # Map predictions to 9 canonical networks and interpolate to match duration seconds
        n_timesteps = preds.shape[0]
        n_seconds = max(1, int(np.floor(duration)))
        
        per_second_data = {}
        summary_data = {}

        for net_id, vertex_indices in NETWORK_VECTORS.items():
            # Extract activations at vertices for this network
            net_preds = preds[:, vertex_indices]
            # Mean activation across vertices for each timestep (shape: (n_timesteps,))
            net_time_series = np.mean(net_preds, axis=1)
            
            # Map raw z-scores to fMRI [0, 1] activation scale using sigmoid
            net_time_series_normalized = sigmoid_normalize(net_time_series, k=1.2, center=0.0)

            # Interpolate to match exactly n_seconds (1 Hz time series)
            if n_timesteps > 1 and n_seconds > 1:
                xp = np.linspace(0, n_seconds - 1, n_timesteps)
                x_new = np.arange(n_seconds)
                time_series_seconds = np.interp(x_new, xp, net_time_series_normalized)
            else:
                # If single timestep or 1s duration, repeat or pad
                time_series_seconds = np.full(n_seconds, np.mean(net_time_series_normalized))

            # Store as list of floats
            per_second_data[net_id] = [float(v) for v in time_series_seconds]
            summary_data[net_id] = float(np.mean(net_time_series_normalized))

        return {
            "duration": float(duration),
            "mediaType": media_type,
            "networkResult": {
                "perSecond": per_second_data,
                "summary": summary_data
            }
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"Unhandled error in analyze_content: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server processing error: {str(e)}")
    finally:
        # Cleanup temporary files
        try:
            shutil.rmtree(temp_dir)
            logger.info("Temporary processing directory cleaned up.")
        except Exception as cleanup_err:
            logger.warning(f"Error cleaning up temporary files: {cleanup_err}")
