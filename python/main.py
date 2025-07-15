import librosa
import noisereduce as nr
import soundfile as sf
from piano_transcription_inference import PianoTranscription, sample_rate

# Load MP3
audio_path = "ASongOfSimplicity.mp3"
audio, _ = librosa.load(path=audio_path, sr=sample_rate, mono=True)

# Noise reduction (using first 0.5s as noise profile)
noise_profile = audio[0:int(0.25 * sample_rate)]
audio_denoised = nr.reduce_noise(
    y=audio,
    y_noise=noise_profile,
    sr=sample_rate,
    prop_decrease=0.6,
    freq_mask_smooth_hz=1500,
    time_mask_smooth_ms=80,
    stationary=True
)

# ✅ Export denoised audio to WAV
sf.write("Piano-MP3-denoised.wav", audio_denoised, sample_rate)

# Transcribe to MIDI
transcriptor = PianoTranscription(device='cpu', checkpoint_path=None)
transcribed_dict = transcriptor.transcribe(audio_denoised, 'test-3.mid')