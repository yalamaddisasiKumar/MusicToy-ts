
import { NoteOffEvt, NoteOnEvt, SYNTH_BUF_SIZE } from "./piece";
import { assert, isPosInt } from "./util/misc";


/**
Buffer containing only zero data
*/
export const SYNTH_ZERO_BUF = new Float64Array(SYNTH_BUF_SIZE);


/**
@class Synthesis node output
*/
// export class SynthOutput<N extends RecursiveAssign<IOLabel>>{
export class SynthOutput<N extends IO<OutputLabel,SynthOutput<N>>>{
    node: N;
    name: string;
    numChans: number;
    buffers: any[];
    hasData: boolean;
    dsts: any[];
    constructor(node: N, name: OutputLabel, numChans?: number){
        // node.input = node
        // node.output = node
        // node[name] = node

        assert (
            node[name] === undefined,
            'node already has property with this name'
        );
    
        // By default, one output channel
        if (numChans === undefined)
            numChans = 1;
    
        /**
        Parent synthesis node
        */
        this.node = node;
    
        /**
        Output name
        */
        this.name = name;
    
        /**
        Number of output channels
        */
        this.numChans = numChans;
    
        /**
        Output buffers, one per channel
        */
        this.buffers = new Array(numChans);
    
        /**
        Flag to indicate output was produced in the current iteration
        */
        this.hasData = false;
    
        /**
        Connected destination nodes
        */
        this.dsts = [];
    
        // Allocate the output buffers
        for (var i = 0; i < numChans; ++i)
            this.buffers[i] = new Float64Array(SYNTH_BUF_SIZE);
    
        // Create a field in the parent node for this output
        let x = this;
        node[name] = this;
        let y = node[name];
    }

    /**
    Get the buffer for a given channel
    */
    getBuffer (chanIdx?: number)
    {
        assert (
            !(chanIdx === undefined && this.numChans > 1),
            'channel idx must be specified when more than 1 channel'
        );

        if (chanIdx === undefined)
            chanIdx = 0;

        // Mark this output as having data
        this.hasData = true;

        return this.buffers[chanIdx];
    }

    /**
    Connect to a synthesis input
    */
    connect(dst: any)
    {
        assert (
            dst instanceof SynthInput,
            'invalid dst'
        );

        assert (
            this.dsts.indexOf(dst) === -1,
            'already connected to input'
        );

        assert (
            dst.src === undefined,
            'dst already connected to an output'
        );

        assert (
            this.numChans === dst.numChans || 
            this.numChans === 1,
            'mismatch in the channel count'
        );

        //console.log('connecting');

        this.dsts.push(dst);
        dst.src = this;
    }
}

// export class B implements IO<SynthOutput<B>> {

//     // input: SynthOutput<B>;
//     // output: SynthOutput<B>;


//     input: SynthOutput<B>;
//     output: SynthOutput<B>;

//     constructor(){
//         // this.input = new SynthOutput(this, 'input')
//         // this.output = new SynthOutput(this, 'output')
//         // super()
//     let x = new SynthOutput(this as IO<SynthOutput<B>>, 'input') as SynthOutput<B>;
//      this.input = x;
//      let y = new SynthOutput(this as IO<SynthOutput<B>>, 'input') as SynthOutput<B>;

//      this.output = y;
//     }


//     temp(){
//         return this.input.node;
//     }

// }

/**
@class Synthesis node input
*/
export class SynthInput <N extends IO<InputLabel | SignalLabel,SynthInput<N>>>{
    node: N;
    name: string;
    numChans: number;
    src: any;

    constructor(node: N, name: InputLabel | SignalLabel, numChans?: number)
    {
        assert (
            node[name] === undefined,
            'node already has property with this name'
        );
    
        this.node = node;
    
        this.name = name;
    
        this.numChans = numChans!;
    
        this.src = undefined;
    
        node[name] = this;
    }


    /**
    Test if data is available
    */
    hasData()
    {
        if (this.src === undefined)
            return false;

        return this.src.hasData;
    }

    /**
    Get the buffer for a given channel
    */
    getBuffer(chanIdx?: number)
    {
        assert (
            this.src instanceof SynthOutput,
            'synth input not connected to any output'
        );

        assert (
            !(chanIdx === undefined && this.numChans > 1),
            'channel idx must be specified when more than 1 channel'
        );

        assert (
            chanIdx! < this.src.numChans || this.src.numChans === 1,
            'invalid chan idx: ' + chanIdx
        );

        // If the source has no data, return the zero buffer
        if (this.src.hasData === false)
            return SYNTH_ZERO_BUF;

        if (chanIdx === undefined)
            chanIdx = 0;

        if (chanIdx >= this.src.numChans)
            chanIdx = 0;

        return this.src.buffers[chanIdx];
    }

}

/**
@class Synthesis network node
*/
export abstract class SynthNode
{
    /**
    Node name
    */
    name: string;

    constructor(){
        this.name = ""
    }

    /**
    Process an event
    */
    abstract processEvent(evt: NoteOnEvt | NoteOffEvt, time: number): void

    /**
    Update the outputs based on the inputs
    */
    abstract update(time: number, sampleRate: number): any

}



export class SynthNet{
    
    /**
     Sample rate
     */
    sampleRate: number;

    /**
    List of nodes
    */
    nodes: any[] = [];

    /**
    Output node
    */
    outNode : null | OutNode  = null;

    /**
    Topological ordering of nodes
    */
    order: any[] | undefined = [];

    constructor(sampleRate: number){
        assert (
            isPosInt(sampleRate),
            'invalid sample rate'
        );
        this.sampleRate = sampleRate;
    }


    /**
    Add a node to the network
    */
    addNode(node: any)
    {
        assert (
            this.nodes.indexOf(node) === -1,
            'node already in network'
        );

        assert (
            !(node instanceof OutNode && this.outNode !== null),
            'output node already in network'
        );

        if (node instanceof OutNode)
            this.outNode = node;

        // Add the node to the network
        this.nodes.push(node);

        // Invalidate any existing node ordering
        this.order = undefined;

        return node;
    }

    /**
    Produce a topological ordering of the nodes
    */
    orderNodes()
    {
        console.log('Computing node ordering');

        // Set of nodes with no outgoing edges
        var S = [];

        // List sorted in reverse topological order
        var L = [];

        // Total count of input edges
        var numEdges = 0;

        // For each graph node
        for (var i = 0; i < this.nodes.length; ++i)
        {
            var node = this.nodes[i];

            //console.log('Graph node: ' + node.name);

            // List of input edges for this node
            node.inEdges = [];

            // Collect all inputs for this node
            for (let k in node)
            {
                if (node[k] instanceof SynthInput)
                {
                    var synthIn = node[k];

                    //console.log('Input port: ' + synthIn.name);
                    //console.log(synthIn.src);

                    if (synthIn.src instanceof SynthOutput)
                    {
                        //console.log(node.name + ': ' + synthIn.name);

                        node.inEdges.push(synthIn.src);
                        ++numEdges;
                    }
                }
            }

            // If this node has no input edges, add it to S
            if (node.inEdges.length === 0)
                S.push(node);
        }

        console.log('Num edges: ' + numEdges);

        // While S not empty
        while (S.length > 0)
        {
            var node = S.pop();

            console.log('Graph node: ' + node.name);

            L.push(node);

            // For each output port of this node
            for (let k in node)
            {
                if (node[k] instanceof SynthOutput)
                {
                    var synthOut = node[k];

                    // For each destination of this port
                    for (var i = 0; i < synthOut.dsts.length; ++i)
                    {
                        var dstIn = synthOut.dsts[i];
                        var dstNode = dstIn.node;

                        //console.log('dst: ' + dstNode.name);

                        var idx = dstNode.inEdges.indexOf(synthOut);

                        assert (
                            idx !== -1,
                            'input port not found'
                        );

                        // Remove this edge
                        dstNode.inEdges.splice(idx, 1);
                        numEdges--;

                        // If this node now has no input edges, add it to S
                        if (dstNode.inEdges.length === 0)
                            S.push(dstNode);
                    }
                }
            }
        }

        assert (
            numEdges === 0,
            'cycle in graph'
        );

        assert (
            L.length === this.nodes.length,
            'invalid ordering length'
        );

        console.log('Ordering computed');

        // Store the ordering
        this.order = L;
    }

    /**
    Generate audio for each output channel.
    @returns An array of audio samples (one per channel).
    */
    genOutput(time: number)
    {
        assert (
            this.order instanceof Array,
            'node ordering not found'
        );

        assert (
            this.outNode instanceof SynthNode,
            'genSample: output node not found'
        );

        // For each node in the order
        if(this.order)
        for (let i = 0; i < this.order.length; ++i)
        {
            const node = this.order[i];

            // Reset the outputs for this node
            for (let k in node)
                if (node[k] instanceof SynthOutput)
                    node[k].hasData = false;

            // Update this node
            node.update(time, this.sampleRate);
        }

        // Return the output node
        return this.outNode;
    }

}


//============================================================================
// Output node
//============================================================================

/**
@class Output node
@extends SynthNode
*/
// class OutNode  extends SynthNode implements IO<SignalLabel| InputLabel,SynthInput<OutNode>> {
export class OutNode  extends SynthNode implements IO<SignalLabel| InputLabel,SynthInput<OutNode>> {

    numChans: number;
    signal: SynthInput<OutNode> ;

    constructor(numChans?: number)
    {
        super();
        if (numChans === undefined)
            numChans = 2;
    
        /**
        Number of output channels
        */
        this.numChans = numChans;
    
        // Audio input signal
        let x = new SynthInput(this as IO<SignalLabel,SynthInput<OutNode>>, 'signal', numChans);
        this.signal = x as SynthInput<OutNode>;
    
        this.name = 'output';
    }

    /**
    Get the buffer for a given output channel
    */
    getBuffer(chanIdx: number)
    {
        return this.signal.getBuffer(chanIdx);
    }

    processEvent(evt: any, time: number): void {
        // throw new Error("Method not implemented.");
    }
    update(time: number, sampleRate: number) {
        // throw new Error("Method not implemented.");
    }

}


