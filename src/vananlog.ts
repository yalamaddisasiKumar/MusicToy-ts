import { ADSREnv } from "./envelope";
import { Note } from "./music";
import { AllNotesOffEvt, NoteOffEvt, NoteOnEvt, SYNTH_BUF_SIZE } from "./piece";
import { SynthNode, SynthOutput } from "./synth";
import { assert, error } from "./util/misc";

type OSC ={
    type: 'sine',
    duty: number,
    detune: number,
    env: ADSREnv,
    volume: number,
    sync: boolean,
    syncDetune: number
}

type OSCState = {
    cyclePos: number,
    syncCyclePos: number,
    onAmp: number,
    offAmp: number
}

type VNote ={
    note: Note,
    vel: number,
    onTime: number,
    offTime: number,
    oscs: OSCState[],
    filterSt: number[],
    filterOnEnv: number,
    filterOffEnv: number,
    pitchOnEnv: number,
    pitchOffEnv: number
}

export class VAnalog extends SynthNode implements IO<OutputLabel,SynthOutput<VAnalog>>
{
    output: SynthOutput<VAnalog>;
    name: string;
    oscs: OSC[];
    cutoff: number;
    resonance: number;
    filterEnv: ADSREnv;
    filterEnvAmt: number;
    pitchEnv: ADSREnv;
    pitchEnvAmt: number;
    actNotes: VNote[];
    oscBuf: Float64Array;
    noteBuf: Float64Array;

    constructor(numOscs: number){
        
        super();
        if (numOscs === undefined)
            numOscs = 1;
    
        this.name = 'vanalog';
    
        /**
        Array of oscillator parameters
        */
        this.oscs = Array.from({
                length: numOscs,
            },
            ()=>({
                // Oscillator type
                type: 'sine',

                // Duty cycle, for pulse wave
                duty: 0.5,
        
                // Oscillator detuning, in cents
                detune: 0,
        
                // ADSR amplitude envelope
                env: new ADSREnv(0.05, 0.05, 0.2, 0.1),
        
                // Mixing volume
                volume: 1,
        
                // Oscillator sync flag
                sync: false,
        
                // Syncing oscillator detuning
                syncDetune: 0,

            })
        );
    
        /**
        Filter cutoff [0,1]
        */
        this.cutoff = 1;
    
        /**
        Filter resonance [0,1]
        */
        this.resonance = 0;
    
        /**
        Filter envelope
        */
        this.filterEnv = new ADSREnv(0, 0, 1, Infinity);
    
        /**
        Filter envelope modulation amount
        */
        this.filterEnvAmt = 1;
    
        /**
        Pitch envelope
        */
        this.pitchEnv = new ADSREnv(0, 0, 1, Infinity);
    
        /**
        Pitch envelope amount
        */
        this.pitchEnvAmt = 0;
    
        /**
        Active/on note array
        */
        this.actNotes = [];
    
        /**
        Temporary oscillator buffer, for intermediate processing
        */
        this.oscBuf = new Float64Array(SYNTH_BUF_SIZE);
    
        /**
        Temporary note buffer, for intermediate processing
        */
        this.noteBuf = new Float64Array(SYNTH_BUF_SIZE);
    
        // Sound output
        let x = new SynthOutput(this as IO<OutputLabel, SynthOutput<VAnalog>>, 'output');
        this.output = x as SynthOutput<VAnalog>;
    }

    /**
    Process an event
    */
    processEvent(evt: NoteOnEvt | NoteOffEvt | AllNotesOffEvt, time: number)
    {
        // Note-on event
        if (evt instanceof NoteOnEvt)
        {
            // Get the note
            var note = evt.note;

            // Try to find the note among the active list
            let noteState = undefined;
            for (var i = 0; i < this.actNotes.length; ++i)
            {
                var state = this.actNotes[i];

                if (state.note === note)
                {
                    noteState = state;
                    break;
                }
            }

            // If the note was not active before
            if (noteState === undefined)
            {
                noteState = {} as VNote;

                // Note being played
                noteState.note = note;

                // Note velocity
                noteState.vel = evt.vel;

                // Time a note-on was received
                noteState.onTime = time;

                // Time a note-off was received
                noteState.offTime = 0;

                // Initialize the oscillator states
                noteState.oscs = new Array(this.oscs.length);
                for (var i = 0; i < this.oscs.length; ++i)
                {
                    var oscState = {} as OSCState;
                    noteState.oscs[i] = oscState;

                    // Cycle position
                    oscState.cyclePos = 0;

                    // Sync cycle position
                    oscState.syncCyclePos = 0;

                    // Envelope amplitude at note-on and note-off time
                    oscState.onAmp = 0;
                    oscState.offAmp = 0;
                }

                // Initialize the filter state values
                noteState.filterSt = new Array(8);
                for (var i = 0; i < noteState.filterSt.length; ++i)
                    noteState.filterSt[i] = 0;

                // Filter envelope value at note-on and note-off time
                noteState.filterOnEnv = 0;
                noteState.filterOffEnv = 0;

                // Pitch envelope value at note-on and note-off time
                noteState.pitchOnEnv = 0;
                noteState.pitchOffEnv = 0;

                // Add the note to the active list
                this.actNotes.push(noteState);
            }

            // If the note was active before
            else
            {
                // Store the oscillator amplitudes at note-on time
                for (var i = 0; i < this.oscs.length; ++i)
                {
                    var oscState = noteState.oscs[i];

                    oscState.onAmp = this.oscs[i].env.getValue(
                        time,
                        noteState.onTime, 
                        noteState.offTime,
                        oscState.onAmp,
                        oscState.offAmp
                    );

                    //console.log('on amp: ' + oscState.onAmp);
                }

                // Filter envelope value at note-on time
                noteState.filterOnEnv = this.filterEnv.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    noteState.filterOnEnv,
                    noteState.filterOffEnv
                );

                // Pitch envelope value at note-on time
                noteState.pitchOnEnv = this.pitchEnv.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    noteState.pitchOnEnv,
                    noteState.pitchOffEnv
                );

                // Note velocity
                noteState.vel = evt.vel;

                // Set the on and off times
                noteState.onTime = time;
                noteState.offTime = 0;
            }

            //console.log('on time: ' + noteState.onTime);
        }

        // Note-off event
        else if (evt instanceof NoteOffEvt)
        {
            // Get the note
            let note = evt.note;

            // Try to find the note among the active list
            let noteState  = undefined;
            for (let i = 0; i < this.actNotes.length; ++i)
            {
                const state = this.actNotes[i];

                if (state.note === note)
                {
                    noteState = state;
                    break;
                }
            }

            // If the note is active
            if (noteState !== undefined)
            {
                // Store the oscillator amplitudes at note-off time
                for (let i = 0; i < this.oscs.length; ++i)
                {
                    const oscState = noteState.oscs[i];

                    oscState.offAmp = this.oscs[i].env.getValue(
                        time,
                        noteState.onTime, 
                        noteState.offTime,
                        oscState.onAmp,
                        oscState.offAmp
                    );
                }

                // Filter envelope value at note-off time
                noteState.filterOffEnv = this.filterEnv.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    noteState.filterOnEnv,
                    noteState.filterOffEnv
                );


                // Pitch envelope value at note-off time
                noteState.pitchOffEnv = this.pitchEnv.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    noteState.pitchOnEnv,
                    noteState.pitchOffEnv
                );

                // Set the note-off time
                noteState.offTime = time;
            }
        }

        // All notes off event
        else if (evt instanceof AllNotesOffEvt)
        {
            this.actNotes = [];
        }

        // By default, do nothing
    }

    /**
    Update the outputs based on the inputs
    */
    update(time: number, sampleRate: number)
    {
        // If there are no active notes, do nothing
        if (this.actNotes.length === 0)
            return;

        // Get the output buffer
        var outBuf = this.output.getBuffer(0);

        // Initialize the output to 0
        for (var i = 0; i < outBuf.length; ++i)
            outBuf[i] = 0;

        // Get the time at the end of the buffer
        var endTime = time + ((outBuf.length - 1) / sampleRate);

        // For each active note
        for (var i = 0; i < this.actNotes.length; ++i)
        {
            var noteState = this.actNotes[i];

            // Initialize the note buffer to 0
            for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
                this.noteBuf[smpIdx] = 0;

            // Maximum end amplitude value
            let maxEndAmp = 0;

            // For each oscillator
            for (let oscNo = 0; oscNo < this.oscs.length; ++oscNo)
            {
                var oscParams = this.oscs[oscNo];
                var oscState = noteState.oscs[oscNo];

                // Generate the oscillator signal
                this.genOsc(
                    time,
                    this.oscBuf,
                    oscParams,
                    oscState,
                    noteState, 
                    sampleRate
                );

                // Compute the note volume
                var noteVol = noteState.vel * oscParams.volume;

                // Get the amplitude value at the start of the buffer
                var ampStart = noteVol * oscParams.env.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    oscState.onAmp,
                    oscState.offAmp
                );

                // Get the envelope value at the end of the buffer
                var ampEnd = noteVol * oscParams.env.getValue(
                    endTime,
                    noteState.onTime, 
                    noteState.offTime,
                    oscState.onAmp,
                    oscState.offAmp
                );

                //console.log('start time: ' + time);
                //console.log('start env: ' + envStart);
                //console.log('end: ' + envEnd);

                // Update the maximum end envelope value
                maxEndAmp = Math.max(maxEndAmp, ampEnd);

                // Modulate the output based on the amplitude envelope
                for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
                {
                    var ratio = (smpIdx / (outBuf.length - 1));
                    this.oscBuf[smpIdx] *= ampStart + ratio * (ampEnd - ampStart);
                }

                // Accumulate the sample values in the note buffer
                for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
                    this.noteBuf[smpIdx] += this.oscBuf[smpIdx];
            }

            // Apply the filter to the temp buffer
            this.applyFilter(time, noteState, this.noteBuf);

            // Accumulate the sample values in the output buffer
            for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
                outBuf[smpIdx] += this.noteBuf[smpIdx];

            // If all envelopes have fallen to 0, remove the note from the active list        
            if (maxEndAmp === 0)
            {
                this.actNotes.splice(i, 1);
                i--;
            }
        }
    }

    /**
    Generate output for an oscillator and update its position
    */
    genOsc  (
        time: number,
        outBuf: any, 
        oscParams: any, 
        oscState: any, 
        noteState: any, 
        sampleRate: number
    )
    {
        // Get the pitch envelope detuning value
        var envDetune = this.pitchEnvAmt * this.pitchEnv.getValue(
            time,
            noteState.onTime, 
            noteState.offTime,
            noteState.pitchOnEnv,
            noteState.pitchOffEnv
        );

        // Get the note
        var note = noteState.note;

        // Get the oscillator frequency
        var freq = note.getFreq(oscParams.detune + envDetune);

        // Get the initial cycle position
        var cyclePos = oscState.cyclePos;

        // Compute the cycle position change between samples
        var deltaPos = freq / sampleRate;

        // Get the sync oscillator frequency
        var syncFreq = note.getFreq(oscParams.syncDetune);

        // Get the initial sync cycle position
        var syncCyclePos = oscState.syncCyclePos;

        // Compute the cycle position change between samples
        var syncDeltaPos = syncFreq / sampleRate;

        // For each sample to be produced
        for (var i = 0; i < outBuf.length; ++i)
        {
            // Switch on the oscillator type/waveform
            switch (oscParams.type)
            {
                // Sine wave        
                case 'sine':
                outBuf[i] = Math.sin(2 * Math.PI * cyclePos);
                break;

                // Triangle wave
                case 'triangle':
                if (cyclePos < 0.5)
                    outBuf[i] = (4 * cyclePos) - 1;
                else
                    outBuf[i] = 1 - (4 * (cyclePos - 0.5));
                break;

                // Sawtooth wave
                case 'sawtooth':
                outBuf[i] = -1 + (2 * cyclePos);
                break;

                // Pulse wave
                case 'pulse':
                if (cyclePos < oscParams.duty)
                    outBuf[i] = -1;
                else
                    outBuf[i] = 1;
                break;

                // Noise
                case 'noise':
                outBuf[i] = 1 - 2 * Math.random();
                break;

                default:
                error('invalid waveform: ' + oscParams.type);
            }

            cyclePos += deltaPos;

            if (cyclePos > 1) 
                cyclePos -= 1;

            if (oscParams.sync === true)
            {
                syncCyclePos += syncDeltaPos;

                if (syncCyclePos > 1)
                {
                    syncCyclePos -= 1;
                    cyclePos = 0;
                }
            }
        }

        // Set the final cycle position
        oscState.cyclePos = cyclePos;

        // Set the final sync cycle position
        oscState.syncCyclePos = syncCyclePos;
    }

    /**
    Apply a filter to a buffer of samples
    IIR, 2-pole, resonant Low Pass Filter (LPF)
    */
    applyFilter(time: number, noteState: any, buffer: any)
    {
        assert (
            this.cutoff >= 0 && this.cutoff <= 1,
            'invalid filter cutoff'
        );

        assert (
            this.resonance >= 0 && this.resonance <= 1,
            'invalid filter resonance'
        );

        var filterEnvVal = this.filterEnv.getValue(
            time,
            noteState.onTime, 
            noteState.offTime,
            noteState.filterOnEnv,
            noteState.filterOffEnv
        );

        var filterEnvMag = (1 - this.cutoff) * this.filterEnvAmt;

        var cutoff = this.cutoff + filterEnvMag * filterEnvVal;

        var c = Math.pow(0.5, (1 - cutoff) / 0.125);
        var r = Math.pow(0.5, (this.resonance + 0.125) / 0.125);

        var mrc = 1 - r * c;

        var v0 = noteState.filterSt[0];
        var v1 = noteState.filterSt[1];

        for (var i = 0; i < buffer.length; ++i)
        {
            v0 = (mrc * v0) - (c * v1) + (c * buffer[i]);
            v1 = (mrc * v1) + (c * v0);

            buffer[i] = v1;
        }

        noteState.filterSt[0] = v0;
        noteState.filterSt[1] = v1;
    }

}
// VAnalog.prototype = new SynthNode();
