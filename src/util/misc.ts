
/**
Assert that a condition holds true
*/
export function assert(condition: any, errorText: string)
{
    if (!condition)
    {
        error(errorText);
    }
}


/**
Abort execution because a critical error occurred
*/
export function error(errorText: string)
{
    alert('ERROR: ' + errorText);

    throw errorText;
}

/**
Test that a value is integer
*/
export function isInt(val: number)
{
    return (
        Math.floor(val) === val
    );
}

/**
Test that a value is a nonnegative integer
*/
export function isNonNegInt(val: number)
{
    return (
        isInt(val) &&
        val >= 0
    );
}

/**
Test that a value is a strictly positive (nonzero) integer
*/
export function isPosInt(val: number)
{
    return (
        isInt(val) &&
        val > 0
    );
}

/**
Get the current time in millisseconds
*/
export function getTimeMillis()
{
    return (new Date()).getTime();
}

/**
Get the current time in seconds
*/
export function getTimeSecs()
{
    return (new Date()).getTime() / 1000;
}

/**
Generate a random integer within [a, b]
*/
export function randomInt(a: number, b: number)
{
    assert (
        isInt(a) && isInt(b) && a <= b,
        'invalid params to randomInt'
    );

    const range = b - a;

    return a + Math.floor(Math.random() * (range + 1));
}

/**
Generate a random boolean
*/
export function randomBool()
{
    return (randomInt(0, 1) === 1);
}

/**
Generate a random floating-point number within [a, b]
*/
function randomFloat(a?: number , b?: number)
{
    if (a === undefined)
        a = 0;
    if (b === undefined)
        b = 1;

    assert (
        a <= b,
        'invalid params to randomFloat'
    );

    const range = b - a;

    return a + Math.random() * range;
}

/**
Generate a random value from a normal distribution
*/
export function randomNorm(mean: number, variance: number)
{
	// Declare variables for the points and radius
    var x1, x2, w;

    // Repeat until suitable points are found
    do
    {
    	x1 = 2.0 * randomFloat() - 1.0;
    	x2 = 2.0 * randomFloat() - 1.0;
    	w = x1 * x1 + x2 * x2;
    } while (w >= 1.0 || w == 0);

    // compute the multiplier
    w = Math.sqrt((-2.0 * Math.log(w)) / w);
    
    // compute the gaussian-distributed value
    var gaussian = x1 * w;
    
    // Shift the gaussian value according to the mean and variance
    return (gaussian * variance) + mean;
}

/**
Choose a random argument value uniformly randomly
*/
export function randomChoice()
{
    assert (
        arguments.length > 0,
        'must supply at least one possible choice'
    );

    var idx = randomInt(0, arguments.length - 1);

    return arguments[idx];
}

/**
Generate a weighed random choice function
*/
export function genChoiceFn()
{
    assert (
        arguments.length > 0 && arguments.length % 2 === 0,
        'invalid argument count: ' + arguments.length
    );

    const numChoices = arguments.length / 2;

    const choices: any[] = [];
    const weights: number[] = [];
    let weightSum = 0;

    for (var i = 0; i < numChoices; ++i)
    {
        var choice = arguments[2*i];
        var weight = arguments[2*i + 1];

        choices.push(choice);
        weights.push(weight);

        weightSum += weight;
    }

    assert (
        weightSum > 0,
        'weight sum must be positive'
    );

    const limits: any[] = [];
    let limitSum = 0;

    for (var i = 0; i < weights.length; ++i)
    {
        var normWeight = weights[i] / weightSum;

        limitSum += normWeight;

        limits[i] = limitSum;
    }

    function choiceFn()
    {
        const r = Math.random();

        for (let i = 0; i < numChoices; ++i)
        {
            if (r < limits[i])
                return choices[i];
        }

        return choices[numChoices-1];
    }

    return choiceFn;
}

// /**
// Resample and normalize an array of data points
// */
// function resample(data, numSamples, outLow, outHigh, inLow, inHigh)
// {
//     // Compute the number of data points per samples
//     var ptsPerSample = data.length / numSamples;

//     // Compute the number of samples
//     var numSamples = Math.floor(data.length / ptsPerSample);

//     // Allocate an array for the output samples
//     var samples = new Array(numSamples);

//     // Extract the samples
//     for (var i = 0; i < numSamples; ++i)
//     {
//         samples[i] = 0;

//         var startI = Math.floor(i * ptsPerSample);
//         var endI = Math.min(Math.ceil((i+1) * ptsPerSample), data.length);
//         var numPts = endI - startI;

//         for (var j = startI; j < endI; ++j)
//             samples[i] += data[j];

//         samples[i] /= numPts;
//     }    

//     // If the input range is not specified
//     if (inLow === undefined && inHigh === undefined)
//     {
//         // Min and max sample values
//         var inLow = Infinity;
//         var inHigh = -Infinity;

//         // Compute the min and max sample values
//         for (var i = 0; i < numSamples; ++i)
//         {
//             inLow = Math.min(inLow, samples[i]);
//             inHigh = Math.max(inHigh, samples[i]);
//         }
//     }

//     // Compute the input range
//     var iRange = (inHigh > inLow)? (inHigh - inLow):1;

//     // Compute the output range
//     var oRange = outHigh - outLow;

//     // Normalize the samples
//     samples.forEach(
//         function (v, i) 
//         {
//             var normVal = (v - inLow) / iRange;
//             samples[i] =  outLow + (normVal * oRange);
//         }
//     );

//     // Return the normalized samples
//     return samples;
// }


