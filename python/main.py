import librosa
from piano_transcription_inference import PianoTranscription, sample_rate

# audio_path = "ChrisZabriskiePreludeNo.7 copy.mp3"
audio_path = "Piano-MP3.mp3"

# Load audio
audio, _ = librosa.load(path=audio_path, sr=sample_rate, mono=True)

# Transcriptor
transcriptor = PianoTranscription(device='cpu', checkpoint_path=None)  # device: 'cuda' | 'cpu'

# Transcribe and write out to MIDI file
transcribed_dict = transcriptor.transcribe(audio, 'test-2.mid')