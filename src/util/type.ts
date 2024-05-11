
type InputLabel = 'input'
type OutputLabel = 'output'
type SignalLabel = 'signal'

type IOLabel = InputLabel | OutputLabel | SignalLabel

type IO<L extends KeyTypes,T> = {
    [k in L] ?: T;
};

let x = {} as IO<InputLabel, {a: number}>


/**
 @description possible keys to any object
 */
type KeyTypes = string | number | symbol

type RecursiveAssign<T extends KeyTypes> = {
    [K in T] ?: RecursiveAssign<T>;
};