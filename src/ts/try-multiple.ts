export default function tM(callback: ((a: any) => PromiseLike<any>), retries: number = 5): (a: any) => PromiseLike<any> {
    if (retries <= 1) {
        return callback;
    }
    return (a) => callback(a).then(x => x, (e) => {console.log(e); return delay(1000)
        .then(() => tM(callback, retries - 1)(a));});
}

function delay(ms: number) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms)
    });
}

export function tMS(callback: ((a: any) => any), retries: number = 5): (a: any) => any {
    if (retries == 1) {
        return a => callback(a);
    }
    return (a) => {
        try {
            return callback(a);
        } catch {
            return tMS(callback, retries - 1)(a);
        }
    }
}