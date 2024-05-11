

export function getAudioContext(){
    let audioCtx: AudioContext | undefined = undefined;
    if (globalThis.hasOwnProperty('AudioContext') === true){
        audioCtx = new AudioContext();
    }
    return audioCtx;
}