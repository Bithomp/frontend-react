import cc from 'five-bells-condition'
import { randomBytes } from 'crypto'

export const generateConditionAndFulfillment = () => {
  const pre = randomBytes(32)
  const f   = new cc.PreimageSha256()
  f.setPreimage(pre)
  return {
    condition:   f.getConditionBinary().toString('hex').toUpperCase(),
    fulfillment: f.serializeBinary().toString('hex').toUpperCase(),
    preimage:    pre.toString('hex').toUpperCase()
  }
}
