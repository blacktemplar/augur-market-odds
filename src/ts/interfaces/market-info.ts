import {SingleOutcomeOrderBookSide, Order} from 'augur.js';
import Big from 'big.js';

export default interface MarketInfo {
    id: string,
    orders?: {[outcome: string]: SingleOutcomeOrderBookSide}
    odds?: MarketOdds,
    outcomes: OutcomeInfo[],
    marketType: string,
    settlementFee: string,
    description: string
}

export interface MarketOdds {
    [outcome: string]: SingleOutcomeOdd[]
}

export interface SingleOutcomeOdd {
    odd: Big,
    amount: Big,
    orders: OddOrder[]
}

export interface OddOrder {
    amount: Big,
    order: Order
}

interface OutcomeInfo {
    id: string,
    description: string
}