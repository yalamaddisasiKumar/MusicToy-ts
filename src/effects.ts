/*****************************************************************************
*
*  This file is part of the MusicToy project. The project is
*  distributed at:
*  https://github.com/maximecb/MusicToy
*
*  Copyright (c) 2012, Maxime Chevalier-Boisvert. All rights reserved.
*
*  This software is licensed under the following license (Modified BSD
*  License):
*
*  Redistribution and use in source and binary forms, with or without
*  modification, are permitted provided that the following conditions are
*  met:
*   1. Redistributions of source code must retain the above copyright
*      notice, this list of conditions and the following disclaimer.
*   2. Redistributions in binary form must reproduce the above copyright
*      notice, this list of conditions and the following disclaimer in the
*      documentation and/or other materials provided with the distribution.
*   3. The name of the author may not be used to endorse or promote
*      products derived from this software without specific prior written
*      permission.
*
*  THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED
*  WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
*  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
*  NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
*  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
*  NOT LIMITED TO PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
*  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
*  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

import { NoteOnEvt, NoteOffEvt } from "./piece";
import { SynthInput, SynthNode, SynthOutput } from "./synth";

/**
@class Overdrive distortion effect
@extends SynthNode
*/
    input: SynthInput<Overdrive>;
export class Overdrive extends SynthNode implements IO<(InputLabel | OutputLabel) , SynthOutput<Overdrive> | SynthInput<Overdrive>> {
    processEvent(evt: NoteOnEvt | NoteOffEvt, time: number): void {
        // throw new Error("Method not implemented.");
    }
    name: string;
    gain: number;
    threshold: number;
    factor: number;
    input: SynthInput<Overdrive>;
    output: SynthOutput<Overdrive>;
    
    constructor(numOscs?: number)
    {
        super();
        this.name = 'overdrive';
    
        /**
        Input gain
        */
        this.gain = 1;
    
        /**
        Clipping threshold
        */
        this.threshold = 0.7;
    
        /**
        Clipping factor (ratio is 1 / factor)
        */
        this.factor = 1;
    
        // Sound Input
        // let x = new SynthInput(this as IO<InputLabel,SynthOutput<Overdrive>>, 'input');
        let x = new SynthInput(this as IO<InputLabel, SynthInput<Overdrive>>, 'input');
        this.input = x as SynthInput<Overdrive>
    
        // Sound output
        let y = new SynthOutput(this as IO<OutputLabel, SynthOutput<Overdrive>>, 'output');
        this.output = y as SynthOutput<Overdrive>
    }
    /**
    Update the outputs based on the inputs
    */
    update(time?: number, sampleRate?: number)
    {
        // If this input has no available data, do nothing
        if (this.input.hasData() === false)
            return;
    
        // Get the input buffer
        var inBuf = this.input.getBuffer();
    
        // Get the output buffer
        var outBuf = this.output.getBuffer();
    
        var f = 1 / this.factor;
    
        // For each sample
        for (var i = 0; i < inBuf.length; ++i)
        {
            var s = inBuf[i] * this.gain;
    
            var absS = Math.abs(s);
    
            var d = absS - this.threshold;
    
            if (d > 0)
            {
                absS = (absS - d) + (f * d);
    
                s = (s > 0)? absS:-absS;                
            }
    
            outBuf[i] = s;
        }
    }

}    

