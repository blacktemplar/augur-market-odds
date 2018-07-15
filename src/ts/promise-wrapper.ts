import Augur from 'augur.js';
import {promisify} from 'es6-promisify';


function deepPromisify(o: any): any {
    if (typeof o === "function") {
        return promisify(o);
    } else if (typeof o === "object") {
        return Object
            .entries(o)
            .map(p => ({key: p[0], val: deepPromisify(p[1])}))
            .reduce((o, p) => Object.assign(o, {[p.key]: p.val}), {});
    } else {
        return o;
    }
}

export default deepPromisify(new Augur());