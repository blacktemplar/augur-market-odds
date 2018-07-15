import MarketInfo, {MarketOdds, OddOrder, SingleOutcomeOdd} from './interfaces/market-info';
import {Order} from 'augur.js';
import Big from 'big.js';

export default function computeOdds(marketInfo: MarketInfo): MarketOdds {
    //sort orders
    let sortedOrders: {[o: string]: {[bc: string]: CommonPriceOrders[]}} = {};
    for (let outcome in marketInfo.orders) {
        sortedOrders[outcome] = {};
        for (let bc in marketInfo.orders[outcome]) {
            let orders = marketInfo.orders[outcome][bc];
            let sOrders = Object.values(orders)
                .map(o => Object.assign(
                    {exactPrice: Big(o.fullPrecisionPrice), exactAmount: Big(o.fullPrecisionAmount)}, o))
                .sort((a, b) => {
                    if (bc == "sell") {
                        return a.exactPrice.cmp(b.exactPrice);
                    } else {
                        return b.exactPrice.cmp(a.exactPrice);
                    }
                });
            //merge common price orders together
            let commonPriceOrders = [];
            for (let i = 0; i < sOrders.length; i++) {
                let commonPriceOs: CommonPriceOrders = {
                    exactPrice: sOrders[i].exactPrice,
                    totalAmount: sOrders[i].exactAmount,
                    orders: [sOrders[i]]
                };
                while (i + 1 < sOrders.length && sOrders[i + 1].exactPrice.eq(commonPriceOs.exactPrice)) {
                    i++;
                    commonPriceOs.totalAmount = commonPriceOs.totalAmount.add(sOrders[i].exactAmount);
                    commonPriceOs.orders.push(sOrders[i]);
                }
                if (commonPriceOs.totalAmount.gt(0)) {
                    commonPriceOrders.push(commonPriceOs);
                }
            }
            sortedOrders[outcome][bc] = commonPriceOrders;
        }
    }
    let res: MarketOdds = {};
    let fees: Big = Big(marketInfo.settlementFee);
    for (let outcome of marketInfo.outcomes) {
        let id = outcome.id;
        let complementFillState: FillState = {};
        let outcomeCommonLength = 0;
        let outcomeCommonId = 0;
        let numComplementFillStates = 0;
        for (let outcome of marketInfo.outcomes) {
            let bc = outcome.id == id ? "sell" : "buy";
            if (outcome.id in sortedOrders && bc in sortedOrders[outcome.id] &&
                sortedOrders[outcome.id][bc].length > 0) {
                if (outcome.id != id) {
                    complementFillState[outcome.id] = {
                        currentCommonId: 0,
                        currentCommonRemainingAmount: Big(sortedOrders[outcome.id][bc][0].totalAmount),
                        currentOrderId: 0,
                        currentOrderRemainingAmount: Big(sortedOrders[outcome.id][bc][0].orders[0].exactAmount)
                    };
                    numComplementFillStates += 1;
                } else {
                    outcomeCommonLength = sortedOrders[id]["sell"].length;
                }
            }
        }
        let mOdds: SingleOutcomeOdd[] = [];
        while (numComplementFillStates > 0 || outcomeCommonId < outcomeCommonLength) {
            let complementOdd = null;
            let complementPrice = Big(1);
            if (numComplementFillStates > 0) {
                //get best SingleOutcomeOdd by complement outcomes

                //get amount and price sum
                let amount = null;
                let sum = Big(0);
                for (let _id in complementFillState) {
                    if (amount == null || complementFillState[_id].currentCommonRemainingAmount.lt(amount)) {
                        amount = complementFillState[_id].currentCommonRemainingAmount;
                    }
                    sum = sum.plus(sortedOrders[_id]["buy"][complementFillState[_id].currentCommonId].exactPrice);
                }

                let orders = [];
                //collect orders and adapt fill states
                for (let _id in complementFillState) {
                    let remaining = Big(amount);
                    let increaseCurrentOrderId = function() {
                        complementFillState[_id].currentOrderId++;
                        complementFillState[_id].currentOrderRemainingAmount =
                            Big(sortedOrders[_id]["buy"][complementFillState[_id].currentCommonId]
                                .orders[complementFillState[_id].currentOrderId].exactAmount);
                    };
                    while (remaining.gt(0)) {
                        let tooMuch = remaining.gt(complementFillState[_id].currentOrderRemainingAmount);
                        let amount = Big(tooMuch ? complementFillState[_id].currentOrderRemainingAmount : remaining);
                        remaining = remaining.minus(amount);
                        complementFillState[_id].currentCommonRemainingAmount =
                            complementFillState[_id].currentCommonRemainingAmount.minus(amount);
                        if (!tooMuch) {
                            complementFillState[_id].currentOrderRemainingAmount =
                                complementFillState[_id].currentOrderRemainingAmount.minus(amount);
                        }

                        orders.push({
                            amount: amount,
                            order: sortedOrders[_id]["buy"][complementFillState[_id].currentCommonId]
                                .orders[complementFillState[_id].currentOrderId]
                        });
                        if (tooMuch) {
                            increaseCurrentOrderId();
                        }
                    }
                    if (complementFillState[_id].currentOrderRemainingAmount.eq(0)) {
                        if (complementFillState[_id].currentCommonRemainingAmount.eq(0)) {
                            //totally done with that outcome remove it
                            delete complementFillState[_id];
                            numComplementFillStates -= 1;
                        } else {
                            increaseCurrentOrderId();
                        }
                    }
                }

                complementPrice = Big(1).minus(sum);
                complementOdd = new _SingleOutcomeOdd(complementPrice, amount, orders, fees);
            }
            let getOddOrders = (orders: MyOrder[]) => orders.map(myOrder => ({amount: myOrder.exactAmount, order: myOrder}));
            while (outcomeCommonId < outcomeCommonLength &&
                complementPrice.gt(sortedOrders[id]["sell"][outcomeCommonId].exactPrice)) {
                const common = sortedOrders[id]["sell"][outcomeCommonId];
                mOdds.push(
                    new _SingleOutcomeOdd(common.exactPrice, common.totalAmount, getOddOrders(common.orders), fees));
                outcomeCommonId++;
            }
            if (outcomeCommonId < outcomeCommonLength &&
                complementPrice.eq(sortedOrders[id]["sell"][outcomeCommonId].exactPrice)) {
                const common = sortedOrders[id]["sell"][outcomeCommonId];
                //add to the given SingleOutcomeOdd
                complementOdd.amount = complementOdd.amount.plus(common.totalAmount);
                complementOdd.orders.concat(getOddOrders(common.orders));
                outcomeCommonId++;
            }
            if (complementOdd != null) {
                mOdds.push(complementOdd);
            }
        }
        res[id] = mOdds;
    }
    return res;
}

class _SingleOutcomeOdd implements SingleOutcomeOdd {
    odd: Big;
    amount: Big;
    orders: OddOrder[];

    constructor(price: Big, amount: Big, orders: OddOrder[], fee: Big) {
        this.amount = amount;
        this.orders = orders;
        this.odd = price.gt(0) ? Big(1).minus(fee).div(price) : Big(0);
    }
}

interface CommonPriceOrders {
    exactPrice: Big,
    totalAmount: Big,
    orders: MyOrder[]
}

interface MyOrder extends Order {
    exactAmount: Big,
    exactPrice: Big
}

interface FillState {
    [outcome: string]: OutcomeFillState
}

interface OutcomeFillState {
    currentCommonId: number,
    currentCommonRemainingAmount: Big,
    currentOrderId: number,
    currentOrderRemainingAmount: Big
}