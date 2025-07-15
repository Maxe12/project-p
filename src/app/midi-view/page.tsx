"use client";

import styles from './page.module.css';
import React, { useEffect, useState } from 'react';

type NoteEvent = {
    startTimeSeconds: number;
    durationSeconds: number;
    pitchMidi: number;
};

// Static dimensions for white key height; width will scale via viewBox
const WHITE_KEY_HEIGHT = 120;
const BLACK_KEY_HEIGHT = 80;
const BLACK_KEY_OFFSET = 20 * 0.6; // relative to base key width (20)

// Helper to determine if a key is black
const isBlackKey = (midi: number) => {
    const pitchClass = midi % 12;
    return [1, 3, 6, 8, 10].includes(pitchClass);
};

// Generate all 88 keys from A0 (21) to C8 (108)
const allKeys = Array.from({ length: 88 }).map((_, i) => 21 + i);

// Piano keyboard component
const PianoKeyboard: React.FC<{ activeNotes: number[] }> = ({ activeNotes }) => {
    // Total logical width: 88 keys × 20 units
    const totalWidth = 88 * 20;

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${totalWidth} ${WHITE_KEY_HEIGHT}`}
            preserveAspectRatio="xMidYMin meet"
        >
            {/* White keys */}
            {allKeys.filter(k => !isBlackKey(k)).map((midi, i) => {
                const x = i * 20;
                const active = activeNotes.includes(midi);
                return (
                    <rect
                        key={midi}
                        x={x}
                        y={0}
                        width={20}
                        height={WHITE_KEY_HEIGHT}
                        fill={active ? '#ffa' : '#fff'}
                        stroke="#000"
                    />
                );
            })}

            {/* Black keys */}
            {allKeys.filter(k => isBlackKey(k)).map((midi) => {
                // Determine index of preceding white key
                const idx = allKeys.filter(k => !isBlackKey(k) && k < midi).length;
                const x = idx * 20 - BLACK_KEY_OFFSET / 2;
                const active = activeNotes.includes(midi);
                return (
                    <rect
                        key={midi}
                        x={x}
                        y={0}
                        width={BLACK_KEY_OFFSET}
                        height={BLACK_KEY_HEIGHT}
                        fill={active ? '#555' : '#000'}
                        stroke="#333"
                    />
                );
            })}
        </svg>
    );
};

// Main viewer component
const MidiViewer: React.FC = () => {
    const [activeNotes, setActiveNotes] = useState<number[]>([]);

    // Handler for incoming MIDI messages
    const onMidiMessage = (e: any) => {
        const [status, note, velocity] = e.data;
        const cmd = status & 0xf0;

        if (cmd === 0x90 && velocity > 0) {
            // note on
            setActiveNotes((prev) => [...prev, note]);
        } else if ((cmd === 0x80) || (cmd === 0x90 && velocity === 0)) {
            // note off
            setActiveNotes((prev) => prev.filter(n => n !== note));
        }
    };

    // useMidiInput(onMidiMessage);

    return (
        <div style={{ width: '100%', overflowX: 'hidden' }}>
            <h3>Live MIDI Piano Viewer</h3>
            <PianoKeyboard activeNotes={activeNotes} />
        </div>
    );
};

export default MidiViewer;
