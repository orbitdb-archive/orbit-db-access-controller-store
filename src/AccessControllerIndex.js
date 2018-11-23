'use strict'

const without = require('lodash.without')

class AccessControllerIndex {
  constructor (id) {
    this._granted = []
    this._revoked = []
  }

  get granted () {
    return new Set(this._granted || [])
  }

  get revoked () {
    return new Set(this._revoked || [])
  }

  updateIndex(oplog) {
    oplog.values
      // .reverse()
      .reduce((handled, item) => {
        const {op, value} = item.payload
        handled[value.access] = handled[value.access] || []
        // if(!handled[value.access].includes(value.publicKey)) {
          if(op === 'GRANT') {
            if (!this._granted) this._granted = []
            // console.log("GRANTed access " + value.access + " to " + value.publicKey)
            // if (!this._granted.includes(e => e.access == value.access && e.publicKey == value.access)) {
              this._granted.push(item)
              handled[value.access].push(value.publicKey)
            // }
          } else if(op === 'REVOKE') {
            if (!this._revoked) this._revoked = []
            // console.log("REVOKEd access " + value.access + " from " + value.publicKey)
            this._revoked.push(item)
            // if (!this._revoked.includes(e => e.access == value.access && e.publicKey == value.access)) {
              this._revoked.push(item)
              handled[value.access].push(value.publicKey)
            // }
          }
        // }
        return handled
      }, {})
  }
}

module.exports = AccessControllerIndex
