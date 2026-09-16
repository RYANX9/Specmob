'use client'

import TradeInFlow from './TradeInFlow'

/**
 * Trade-in route entry point.
 * The complete flow lives in TradeInFlow so phone selection, variants,
 * condition collection, calculation and upgrade recommendations stay in one place.
 */
export default function TradeInClient() {
  return <TradeInFlow />
}
