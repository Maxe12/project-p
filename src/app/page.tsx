"use client";

import styles from "./page.module.css";
import {ChangeEvent, useRef, useState} from "react";
import {
    addPitchBendsToNoteEvents,
    BasicPitch,
    NoteEventTime,
    noteFramesToTime,
    outputToNotesPoly
} from "@spotify/basic-pitch";
import {Midi} from "@tonejs/midi";

const modelPath = "/model.json";

async function resampleAudioBuffer(
    inputBuffer: AudioBuffer,
    targetSampleRate: number = 22050
): Promise<AudioBuffer> {
    const numChannels = inputBuffer.numberOfChannels;
    const duration = inputBuffer.duration;

    const offlineCtx = new OfflineAudioContext(
        numChannels,
        Math.ceil(duration * targetSampleRate),
        targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = inputBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampledBuffer = await offlineCtx.startRendering();
    return resampledBuffer;
}

function convertToMono(buffer: AudioBuffer): AudioBuffer {
    if (buffer.numberOfChannels === 1) return buffer; // Already mono

    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    const monoBuffer = new AudioContext().createBuffer(1, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const mono = monoBuffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        mono[i] = 0.5 * (left[i] + right[i]); // average L + R
    }

    return monoBuffer;
}

export default function Home() {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer>();
    const [notes, setNotes] = useState<NoteEventTime[]>([]);
    const uploadRef = useRef<HTMLInputElement>(null)

    function uploadHandler() {
        if (uploadRef.current) {
            uploadRef.current.click();
        }
    }

    async function passAudioFile(evt: ChangeEvent<HTMLInputElement>) {
        // This function will be called when the user selects a file
        // You can handle the file upload here, e.g., send it to a server or process it
        console.log("Selected file:", evt);

        const file = evt.target.files?.[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);

        const response = await fetch(objectUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const resampledAudioBuffer = await resampleAudioBuffer(audioBuffer, 22050);
        const mono = convertToMono(resampledAudioBuffer);
        console.log('Decoded audio:', audioBuffer);
        setAudioBuffer(mono)

        // cleanup
        URL.revokeObjectURL(objectUrl);
        evt.target.value = "";
    }

    async function startTransformation() {
        const frames: number[][] = [];
        const onsets: number[][] = [];
        const contours: number[][] = [];
        let pct = 0;

        const basicPitch = new BasicPitch(modelPath);
        await basicPitch.evaluateModel(
            audioBuffer as unknown as AudioBuffer,
            (f: number[][], o: number[][], c: number[][]) => {
                frames.push(...f);
                onsets.push(...o);
                contours.push(...c);
            },
            (p: number) => {
                pct = p;
            },
        );

        const notes = noteFramesToTime(
            addPitchBendsToNoteEvents(
                contours,
                outputToNotesPoly(frames, onsets, 0.25, 0.25, 5),
            ),
        );
        console.log(notes)
        setNotes(notes)
    }

    async function exportMIDI() {
        if (!notes.length) {
            console.error("No notes to export");
            return;
        }
        const midi = new Midi();
        const track = midi.addTrack();

        for (const note of notes) {
            track.addNote({
                midi: note.pitchMidi,
                time: note.startTimeSeconds,
                duration: note.durationSeconds,
                velocity: Math.max(0, Math.min(note.amplitude, 1)), // Clamp between 0–1
            });
        }

        const midiBytes = midi.toArray();
        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = "output.mid";
        a.click();

        URL.revokeObjectURL(url);
    }

    return (
        <div className={styles.page}>
          <main className={styles.main}>
            <div className={styles.container}>
                <button className={styles.button} onClick={uploadHandler}>Upload audio file for transcribing</button>
                <input accept=".mp3,audio/*" onChange={passAudioFile} ref={uploadRef} type={"file"} style={{display: "none"}} />
                <button className={styles.button} disabled={!audioBuffer} onClick={startTransformation}>Start transformation</button>
                <button className={styles.button} disabled={!notes.length} onClick={exportMIDI}>Download MIDI</button>
            </div>
          </main>
        </div>
    );
}
