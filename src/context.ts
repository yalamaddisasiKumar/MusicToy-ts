import { initSynth } from "./musictoy";
import { Piece } from "./piece";
import { SynthNet } from "./synth";
import { getAudioContext } from "./util/audio";

type Context = {
    canvas: HTMLCanvasElement;
    canvasCtx: CanvasRenderingContext2D;
    audioCtx: AudioContext;
    playAudio: () => void;
    stopAudio: () => void;
    jsAudioNode: undefined;
    piece: undefined;
    bufferSize: number;
    genAudio: (event: any) => void;
}

export let context = {} as Context;


function getContext() {

    // Get a reference to the canvas
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    // Get a 2D context for the drawing canvas
    const canvasCtx = canvas.getContext("2d")!;

    let audioCtx: AudioContext = getAudioContext()!; 

    // If an audio context was created
    // if (audioCtx !== undefined)
    //     {
            // Get the sample rate for the audio context
            var sampleRate = audioCtx.sampleRate;
    
            console.log('Sample rate: ' + audioCtx.sampleRate);
    
            // Size of the audio generation buffer
            var bufferSize = 2048;
        // }
    
    // // Create a synthesis network
    // var synthNet = new SynthNet(audioCtx.sampleRate);

    // // Create a piece
    var piece: Piece | undefined = undefined;

    // // Initialize the synth network
    // initSynth(synthNet, piece);

    // // Create an audio generation event handler
    var genAudio = (event: any)=>{} ;

    // JS audio node to produce audio output
    let jsAudioNode : ScriptProcessorNode | undefined = undefined;

    return{
        canvas,
        canvasCtx,
        audioCtx,
        playAudio,
        stopAudio,
        jsAudioNode,
        piece,
        bufferSize,
        genAudio
    }
}


const playAudio = function ()
    {
        // If audio is disabled, stop
        if (context.audioCtx === undefined)
            return;

        // If the audio isn't stopped, stop it
        if (context.jsAudioNode !== undefined)
            stopAudio()

        context.audioCtx.resume().then(function ()
        {
            console.log('audio context resumed');

            // Set the playback time on the piece to 0 (start)
            (context.piece as unknown as Piece).setTime(0);

            // Create a JS audio node and connect it to the destination
            (context.jsAudioNode as unknown as ScriptProcessorNode) = context.audioCtx.createScriptProcessor(context.bufferSize, 2, 2);
            (context.jsAudioNode as unknown as ScriptProcessorNode).onaudioprocess = context.genAudio;
    	    (context.jsAudioNode as unknown as ScriptProcessorNode).connect(context.audioCtx.destination);
        });
    }

    const stopAudio = function ()
    {
        // If audio is disabled, stop
        if (context.audioCtx === undefined)
            return;

        if (context.jsAudioNode === undefined)
            return;

        // Notify the piece that we are stopping playback
        (context.piece as unknown as Piece).stop();

        // Disconnect the audio node
        (context.jsAudioNode as unknown as ScriptProcessorNode).disconnect();
        (context.jsAudioNode as unknown) = undefined;

        // Clear the drawing interval
        //clearInterval(drawInterv);
    }
    

export default function start(){
       const ctx= getContext();
       context = ctx;

        // Create a synthesis network
        var synthNet = new SynthNet(context.audioCtx.sampleRate);

        // Create a piece
        var piece: Piece = new Piece(synthNet);

        
        // Initialize the synth network
        initSynth(synthNet, piece);
    
        // Create an audio generation event handler
        var genAudio = piece.makeHandler();

        (context.piece as unknown as Piece) = piece;
        context.genAudio = genAudio;


}