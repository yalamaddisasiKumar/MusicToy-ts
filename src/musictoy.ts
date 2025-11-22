import { context } from "./context";
import { Overdrive } from "./effects";
import { Mixer } from "./mixer";
import { genScale, Note, NOTE_NAME_PC, scaleIntervs } from "./music";
import { Piece, Track } from "./piece";
import { SampleKit } from "./sampling";
import { OutNode, SynthNet } from "./synth";
import { VAnalog } from "./vananlog";

export function initSynth(synthNet: SynthNet, piece: Piece){

    // Bass patch
    const bass = synthNet.addNode(new VAnalog(3));
    bass.name = 'bass';

    bass.oscs[0].type = 'pulse';
    bass.oscs[0].duty = 0.5;
    bass.oscs[0].detune = -1195;
    bass.oscs[0].volume = 1;

    bass.oscs[1].type = 'pulse';
    bass.oscs[1].duty = 0.5;
    bass.oscs[1].detune = -1205;
    bass.oscs[1].volume = 1;

    bass.oscs[2].type = 'sawtooth';
    bass.oscs[2].detune = 0;
    bass.oscs[2].volume = 1;

    bass.oscs[0].env.a = 0;
    bass.oscs[0].env.d = 0.3;
    bass.oscs[0].env.s = 0.1;
    bass.oscs[0].env.r = 0.2;

    bass.oscs[1].env = bass.oscs[0].env;
    bass.oscs[2].env = bass.oscs[0].env;

    bass.cutoff = 0.3;
    bass.resonance = 0;

    bass.filterEnv.a = 0;
    bass.filterEnv.d = 0.25;
    bass.filterEnv.s = 0.25;
    bass.filterEnv.r = 0.25;
    bass.filterEnvAmt = 0.85;

    // Lead patch
    const lead = synthNet.addNode(new VAnalog(2));
    lead.name = 'lead';

    lead.oscs[0].type = 'pulse';
    lead.oscs[0].duty = 0.5;
    lead.oscs[0].detune = -1195;
    lead.oscs[0].volume = 1;

    lead.oscs[1].type = 'pulse';
    lead.oscs[1].duty = 0.5;
    lead.oscs[1].detune = -1205;
    lead.oscs[1].volume = 1;

    lead.oscs[0].env.a = 0;
    lead.oscs[0].env.d = 0.1;
    lead.oscs[0].env.s = 0;
    lead.oscs[0].env.r = 0;

    lead.oscs[1].env = lead.oscs[0].env;

    lead.cutoff = 0.3;
    lead.resonance = 0;

    lead.filterEnv.a = 0;
    lead.filterEnv.d = 0.2;
    lead.filterEnv.s = 0;
    lead.filterEnv.r = 0;
    lead.filterEnvAmt = 0.85;

    // Drum kit
    const sampleKit = synthNet.addNode(new SampleKit());
    sampleKit.mapSample('C4', 'samples/drum/biab_trance_kick_4.wav', 2.2);
    sampleKit.mapSample('C#4', 'samples/drum/biab_trance_snare_2.wav', 2);
    sampleKit.mapSample('D4', 'samples/drum/biab_trance_hat_6.wav', 2);
    sampleKit.mapSample('D#4', 'samples/drum/biab_trance_clap_2.wav', 3);

    // Overdrive effect
    const overdrive = synthNet.addNode(new Overdrive());
    overdrive.gain = 8;
    overdrive.factor = 50;

    // Mixer
    const mixer = synthNet.addNode(new Mixer());
    mixer.inVolume[0] = 0.5;
    mixer.inVolume[1] = 0.5;
    mixer.inVolume[2] = 2;
    mixer.outVolume = 0.7;

    // Sound output node
    const outNode = synthNet.addNode(new OutNode(2));

    // Connect all synth nodes and topologically order them
    bass.output.connect(mixer.input0);
    //vanalog.output.connect(overdrive.input);
    //overdrive.output.connect(mixer.input0);
    lead.output.connect(mixer.input1);
    sampleKit.output.connect(mixer.input2);
    mixer.output.connect(outNode.signal);
    synthNet.orderNodes();

    // Create a track for the bass instrument
    const bassTrack = new Track(bass);
    piece.addTrack(bassTrack);

    // Create a track for the lead instrument
    const leadTrack = new Track(lead);
    piece.addTrack(leadTrack);

    // Create a track for the drum kit
    const drumTrack = new Track(sampleKit);
    piece.addTrack(drumTrack);

    piece.beatsPerMin = 137;
    piece.beatsPerBar = 4;
    piece.noteVal = 4;

    piece.loopTime = piece.beatTime(Sequencer.NUM_BEATS);

    const sequencer = new Sequencer(
        piece,
        leadTrack,
        drumTrack,
        'G4' as `${keyof typeof NOTE_NAME_PC}`,
        'C4' as `${keyof typeof NOTE_NAME_PC}`,
        'minor pentatonic',
        2,
        4
    );

    function redraw()
    {
        sequencer.draw(context.canvas, context.canvasCtx);
    }

    let drawReq: number | undefined;

    function loop() {
        redraw();
        drawReq = requestAnimationFrame(loop);
    }

    let playBtn = document.getElementById('play_btn')!;
    let stopBtn = document.getElementById('stop_btn')!;
    let eraseBtn = document.getElementById('erase_btn')!;

    // Play button
    playBtn.onclick = function ()
    {
        context.stopAudio();

        if (drawReq !== undefined) cancelAnimationFrame(drawReq);
        loop();

        context.playAudio();
    };

    // Stop button
    stopBtn.onclick = function ()
    {
        context.stopAudio();

        if (drawReq !== undefined) cancelAnimationFrame(drawReq);
    };

    // Erase button
    eraseBtn.onclick = function ()
    {
        if(stopBtn)
            (stopBtn.onclick as any)();

        if (confirm('Are you sure?'))
        {
            location.hash = '';
            location.reload();
        }
    };

    // Canvas mouse down handler
    function canvasOnClick(this: HTMLCanvasElement, event: MouseEvent)
    {
        var xPos = event.offsetX;
        var yPos = event.offsetY;

        sequencer.click(xPos, yPos);

        redraw();
    }

    context.canvas.addEventListener("click", canvasOnClick, false);

    sequencer.draw(context.canvas, context.canvasCtx);
}

/**
@class Sequencer interface
*/
class Sequencer{
    static SQR_WIDTH = 20;
    static SQR_HEIGHT = 20;
    static SQR_OUTER_TRIM = 2;
    static SQR_INNER_TRIM = 4;

    static NUM_COLS = 32;
    static SQRS_PER_BEAT = 4;
    static NUM_BEATS = Sequencer.NUM_COLS / Sequencer.SQRS_PER_BEAT;

    piece: any;
    leadTrack: Track;
    drumTrack: Track;
    readonly leadNotes: Note[];
    drumNotes: Note[];
    buttons: ButtonNode[];
    // genHash: () => string;

    constructor(
        piece: any,
        leadTrack: Track,
        drumTrack: Track,
        leadRoot: `${keyof typeof NOTE_NAME_PC}` | Note,
        drumRoot: `${keyof typeof NOTE_NAME_PC}` | Note,
        leadScale: keyof typeof scaleIntervs,
        numOctaves: number,
        numDrums: number
    )
    {
        if ((leadRoot instanceof Note) === false)
            leadRoot =  Note.getNote(leadRoot);
    
        if ((drumRoot instanceof Note) === false)
            drumRoot = Note.getNote(drumRoot);
    
        // Generate the lead instrument notes
        const leadNotes = genScale(leadRoot, leadScale, numOctaves);
    
        // Generate the drum notes
        const drumNotes = [];
        for (let i = 0; i < numDrums; ++i)
            drumNotes.push(drumRoot.offset(i));
    
        /**
        Piece to render to
        */
        this.piece = piece;
    
        /**
        Lead track
        */
        this.leadTrack = leadTrack;
    
        /**
        Drum track
        */
        this.drumTrack = drumTrack;
    
        /**
        Lead instrument notes
        */
        this.leadNotes = leadNotes;
    
        /**
        Drum instrument notes
        */
        this.drumNotes = drumNotes;
    
        /**
        List of buttons
            x
            y
            width
            height
            click
            draw
        */
        this.buttons = [];
    
        // Compute the number of rows
        const numRows = this.leadNotes.length + this.drumNotes.length;
    
        const sequencer = this;
    
        for (let row = 0; row < numRows; ++row)
        {
            for (let col = 0; col < Sequencer.NUM_COLS; ++col)
            {
                const x: [Track, Note, string] = row < this.leadNotes.length? [
                    leadTrack,
                    leadNotes[this.leadNotes.length - 1 - row],
                    'rgb(255,0,0)',
                    ]: [
                        drumTrack,
                        drumNotes[row - this.leadNotes.length],
                        'rgb(255,140,0)',
                    ]
                const button = this.makeButton(
                    Sequencer.SQR_WIDTH * col,
                    Sequencer.SQR_HEIGHT * row,
                    Sequencer.SQR_WIDTH,
                    Sequencer.SQR_HEIGHT,
                    col,
                    ...(x)
                );
                this.buttons.push(button)
            }
        }
    
        // If a location hash is specified
        if (location.hash !== '')
        {
            this.parseHash(location.hash.substr(1));
    
            this.render();
        }
    }
    
    
    /**
    Parse the sequencer state from a given hash string
    */
    parseHash(hashStr: string)
    {
        console.log('Parsing hash string');
    
        let sqrIdx = 0;
    
        // For each hash code character
        for (let i = 0; i < hashStr.length; ++i)
        {
            let code = hashStr.charCodeAt(i) - 97;
    
            for (let j = 0; j < 4; ++j)
            {
                const bit = (code % 2) === 1;
                code >>>= 1;
    
                this.buttons[sqrIdx].onState = bit;
    
                sqrIdx++;
            }
        }
    }
    
    /**
    Generate a hash string from the sequencer state
    */
    genHash()
    {
        const charCodes: number[] = [];
    
        let code = 0;
        let codeLen = 0;
    
        function pushCode()
        {
            let ch = code + 97;
    
            charCodes.push(ch);
    
            code = 0;
            codeLen = 0;
        }
    
        for (let i = 0; i < this.buttons.length; ++i)
        {
            let button = this.buttons[i];
    
            if (button.onState === undefined)
                continue;
    
            const bit = button.onState? 1:0;
    
            code = code + (bit << codeLen);
            codeLen++;
    
            if (codeLen === 4)
                pushCode();
        }
    
        if (codeLen > 0)
            pushCode();
    
        return String.fromCharCode.apply(null, charCodes);
    }
    
    /**
    Create a clickable button
    */
    makeButton(
        x: number,y: number, width: number, height: number, col: number,
        track: Track,
        note: Note,
        color: string,
    )
    {
        return new ButtonNode(
            x, y, width, height, col,
            track,
            note,
            color,
            this
        )
    }
    
    /**
    Click handling
    */
    click(x: number, y: number)
    {
        for (let i = 0; i < this.buttons.length; ++i)
        {
            const button = this.buttons[i];
    
            if (x >= button.x && x < button.x + button.width &&
                y >= button.y && y < button.y + button.height)
                button.click();
        }
    }
    
    /**
    Draw the sequencer
    */
    draw(canvas: HTMLCanvasElement, ctx: typeof context.canvasCtx)
    {
        ctx!.clearRect(0, 0, canvas.width, canvas.height);
    
        // Draw all the buttons
        for (let i = 0; i < this.buttons.length; ++i)
            this.buttons[i].draw(ctx);
    
        // TODO: beat numbers
        // TODO: bar lines
        // TODO: note names
    
        const piece = this.piece;
        const playTime = piece.playTime;
        const totalTime = piece.beatTime(Sequencer.NUM_BEATS);
    
        const playPos = playTime / totalTime;
        const cursorPos = playPos * canvas.width;
    
        const cursorBot = Sequencer.SQR_HEIGHT * (this.leadNotes.length + this.drumNotes.length);
    
        if (playPos !== 0)
        {
            // Draw the cursor line
            context.canvasCtx!.strokeStyle = "white";
            context.canvasCtx!.beginPath();
            context.canvasCtx!.moveTo(cursorPos, 0);
            context.canvasCtx!.lineTo(cursorPos, cursorBot);
            context.canvasCtx!.closePath();
            context.canvasCtx!.stroke();
        }
    }
    
    /**
    Render note output to the piece
    */
    render()
    {
        console.log('Rendering sequencer grid');
    
        this.leadTrack.clear();
        this.drumTrack.clear();
    
        for (let i = 0; i < this.buttons.length; ++i)
        {
            const button = this.buttons[i];
    
            if (button.track === undefined)
                continue;
    
            if (button.onState === false)
                continue;
    
            const beatNo = button.col / Sequencer.SQRS_PER_BEAT;
    
            console.log(button.note.toString());
    
            this.piece.makeNote(
                button.track,
                beatNo,
                button.note,
                1 / Sequencer.SQRS_PER_BEAT
            );
        }
    
        location.hash = this.genHash();
    }
}

class ButtonNode{
    x: number;
    y: number;
    width: number;
    height: number;
    track: Track;
    note: Note;
    color: string;
    onState: boolean;
    col: number;
    sequencer: Sequencer;
    constructor(x: number, y: number, width: number, height: number, col: number,
        track: Track,
        note: Note,
        color: string,
        sequencer: Sequencer
     ){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.onState = false;
        this.col = col;
        this.track = track;
        this.color = color;
        this.note = note;
        this.sequencer = sequencer
    }
    click()
    {
        this.onState = !this.onState;
        this.sequencer.render();
    }
    draw(ctx: typeof context.canvasCtx)
    {
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x + Sequencer.SQR_OUTER_TRIM,
            this.y + Sequencer.SQR_OUTER_TRIM,
            this.width - (2 * Sequencer.SQR_OUTER_TRIM),
            this.height - (2 * Sequencer.SQR_OUTER_TRIM)
        );

        if (this.onState === false)
        {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillRect(
                this.x + Sequencer.SQR_INNER_TRIM,
                this.y + Sequencer.SQR_INNER_TRIM,
                this.width - (2 * Sequencer.SQR_INNER_TRIM),
                this.height - (2 * Sequencer.SQR_INNER_TRIM)
            );
        }
    }
}