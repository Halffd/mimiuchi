const express = require('express');
const { pipeline } = require('@xenova/transformers');
const { WaveFile } = require('wavefile');

const app = express();
const port = 3000;

// Load the Whisper model once on startup
let transcriber = null;

async function loadModel() {
    console.log('Loading Whisper model...');
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    console.log('Whisper model ready on http://localhost:' + port);
}

// Middleware to handle raw binary data (WAV files)
app.use(express.raw({ type: 'audio/wav', limit: '50mb' }));

app.post('/transcribe', async (req, res) => {
    if (!transcriber) {
        return res.status(503).json({ error: 'Model not loaded yet' });
    }

    try {
        const audioBuffer = req.body;
        if (!audioBuffer || audioBuffer.length === 0) {
            return res.status(400).json({ error: 'No audio data received' });
        }

        // Use wavefile to parse the WAV and extract samples
        const wav = new WaveFile(audioBuffer);
        
        // Convert to 16kHz Float32 (Whisper requirement)
        wav.toSampleRate(16000);
        const samples = wav.getSamples(false, Float32Array);
        
        // Handle stereo if necessary (Whisper expects mono)
        const monoSamples = Array.isArray(samples) ? samples[0] : samples;

        console.log(`Transcribing ${audioBuffer.length} bytes...`);
        
        const output = await transcriber(monoSamples, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: req.query.language || 'en',
        });

        console.log('Result:', output.text);
        res.json({ text: output.text });
    } catch (err) {
        console.error('Transcription error:', err);
        res.status(500).json({ error: err.message });
    }
});

loadModel().then(() => {
    app.listen(port);
});
