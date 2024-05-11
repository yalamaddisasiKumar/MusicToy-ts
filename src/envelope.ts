
export class ADSREnv{
    a: number;
    d: number;
    s: number;
    r: number;
    aExp: number;
    dExp: number;
    rExp: number;
    constructor(a: number, d: number, s: number, r: number)
    {
        /**
        Attack time
        */
        this.a = a;
    
        /**
        Decay time
        */
        this.d = d;
    
        /**
        Sustain amplitude [0,1]
        */
        this.s = s;
    
        /**
        Release time
        */
        this.r = r;
    
        /**
        Attack curve exponent
        */
        this.aExp = 2;
    
        /**
        Decay curve exponent
        */
        this.dExp = 2;
    
        /**
        Release curve exponent
        */
        this.rExp = 2;
    }

    // Interpolation function:
    // x ranges from 0 to 1
    static  interp(x: number, yL: number, yR: number, exp: number)
    {
        // If the curve is increasing
        if (yR > yL)
        {
            return yL + Math.pow(x, exp) * (yR - yL);
        }
        else
        {
            return yR + Math.pow(1 - x, exp) * (yL - yR);
        }
    }

    
    /**
    Get the envelope value at a given time
    */
    getValue (curTime: number, onTime: number, offTime: number, onAmp: number, offAmp: number)
    {

        if (offTime === 0)
        {
            var noteTime = curTime - onTime;

            if (noteTime < this.a)
            {
                return ADSREnv.interp(noteTime / this.a, onAmp, 1, this.aExp);
            }
            else if (noteTime < this.a + this.d)
            {
                return ADSREnv.interp((noteTime - this.a) / this.d , 1, this.s, this.dExp);
            }
            else
            {
                return this.s;
            }
        }
        else 
        {
            var relTime = curTime - offTime;

            if (relTime < this.r)
            {
                return ADSREnv.interp(relTime / this.r, offAmp, 0, this.rExp);
            }
            else
            {
                return 0;
            }
        }
    }



}
