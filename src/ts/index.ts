import augur from './promise-wrapper';
import tM from './try-multiple';
import displayMarkets from './display-markets';
import MarketInfo from './interfaces/market-info';
import computeOdds from './compute-odds';
import '../css/style.css';

let infuraProjectId = process.env.INFURA_PROJECT_ID || "";

let ethereumNode = {
    httpAddresses: [
        "http://127.0.0.1:8545", // local HTTP address for Geth node
        "https://mainnet.infura.io/v3/" + infuraProjectId // hosted http address for Geth node on the Rinkeby test network
    ],
    wsAddresses: [
        "ws://127.0.0.1:8546", // local WebSocket address for Geth node
        "wss://mainnet.infura.io/ws/v3/" + infuraProjectId // hosted WebSocket address for Geth node on the Rinkeby test network
    ]
    // ipc addresses can also be specified as:
    // ipcAddresses: [ ... ]
};

// To connect to a hosted Augur Node instead of a local Augur Node, substitute its WebSocket address below.
let augurNode = "wss://augur-node.augur.casino"; // local WebSocket address for an Augur Node
let universe = "0xe991247b78f937d7b69cfc00f1a487a293557677";

augur.connect({ethereumNode, augurNode})
    .then(tM(() => augur.markets.getMarkets({universe, reportingState: "PRE_REPORTING"})))
    .then(tM((marketIds: [string]) =>
        Promise.all([augur.markets.getMarketsInfo({marketIds}),
            augur.trading.getOrders({universe, orderState: "OPEN"})])
    ))
    .then((r: [[MarketInfo], {[k: string]: any}]) => {
        let marketsInfo = r[0].filter((v) => v.marketType != "scalar");
        const orders = r[1];
        for (let marketInfo of marketsInfo) {
            if (marketInfo.id in orders) {
                marketInfo.orders = orders[marketInfo.id];
                marketInfo.odds = computeOdds(marketInfo);
            }
        }
        let el = document.getElementById('content');
        el.innerHTML = "";
        el.appendChild(displayMarkets(marketsInfo));
    })
    .catch((e: any) => {
        console.log(e);
        let h1 = document.createElement("h1");
        h1.innerText = "Connection Error!";
        document.body.appendChild(h1);
    });
