export function Assert(condition : boolean, message : string) {
	if(condition === false) ThrowError(message);
}

export function ThrowError(message : string) {
	throw new Error(message);
} 


export function CreateCounter(start=0, step=1) {
    let count = start;

    return function() {
        count+=step;
        return count;
    };
}

export function Shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
};

export function HasCommonItem<T>(array1: T[], array2: T[]): boolean {
    return array1.some(item => array2.includes(item));
}