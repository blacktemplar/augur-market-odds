import MarketInfo from './interfaces/market-info';
import Big from 'big.js';

export default function displayMarkets(marketsInfo: MarketInfo[]): Node {
    let content = document.createElement("div");
    let caption = document.createElement("h1");
    caption.innerText = "Augur Market Odds";
    content.appendChild(caption);
    let table = document.createElement("div");
    table.className = "table";
    for (let marketInfo of marketsInfo) {
        if (marketInfo.odds) {
            let subDiv = document.createElement("div");
            subDiv.className = "row";
            let headDiv = document.createElement("div");
            headDiv.className = "head";
            let titleDiv = document.createElement("span");
            titleDiv.className = "title";
            titleDiv.innerText = marketInfo.description;
            headDiv.appendChild(titleDiv);
            let oddsDiv = document.createElement("div");
            oddsDiv.className = "odds";
            let hasAnyOdds = false;
            let oddPs: [Node, Big, string][] = [];
            let margin = Big(-1);
            let isBinary = false;
            for (let outcome of marketInfo.outcomes) {
                let oddP = document.createElement("span");
                let hasOdd = outcome.id in marketInfo.odds &&
                    marketInfo.odds[outcome.id].length > 0 &&
                    (marketInfo.odds[outcome.id][0].odd.gt(1) || marketInfo.odds[outcome.id][0].odd.eq(0));
                let value = hasOdd ? marketInfo.odds[outcome.id][0].odd : Big(1);
                if (hasOdd && !value.eq(0)) {
                    margin = margin.plus(Big(1).div(value));
                } else if (!hasOdd) {
                    margin = margin.plus(Big(1));
                }
                isBinary = outcome.description === null;
                oddP.innerText = (!isBinary ? outcome.description : outcome.id ? "Yes" : "No") + ": " +
                    (hasOdd ? value.eq(0) ? "INF (ARBITRAGE)" : value.toFixed(2) : "1.0");
                if (hasOdd) {
                    hasAnyOdds = true;
                }
                oddPs.push([oddP, value, outcome.id]);
                oddsDiv.appendChild(oddP);
            }
            if (hasAnyOdds) {
                let marginSpan = document.createElement("span");
                marginSpan.innerText = "(Margin: " + margin.times(100).toFixed(2) + "%)";
                headDiv.appendChild(marginSpan);

                if (isBinary) {
                    oddPs.sort(
                        (a: [Node, Big, string], b: [Node, Big, string]) => parseInt(b[2]) - parseInt(a[2]));
                } else {
                    oddPs.sort((a: [Node, Big, string], b: [Node, Big, string]) => a[1].cmp(b[1]));
                }
                for (let a of oddPs) {
                    oddsDiv.appendChild(a[0]);
                }

                subDiv.appendChild(headDiv);
                subDiv.appendChild(oddsDiv);
                table.appendChild(subDiv);
            }
        }
    }
    content.appendChild(table);
    return content;
}