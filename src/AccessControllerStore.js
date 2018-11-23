'use strict'

const Store = require('orbit-db-store')
const AccessControllerIndex = require('./AccessControllerIndex')
const without = require('lodash.without')

class AccessControllerStore extends Store {
  constructor(ipfs, id, dbname, options = {}) {
    super(ipfs, id, dbname, Object.assign({}, options, { Index: AccessControllerIndex }))
    this._type = 'access-controller'
  }

  all () {
    const granted = Array.from(this._index.granted.values())
    const revoked = Array.from(this._index.revoked.values())

    // console.log("!!!1", granted)
    // console.log("!!!2", revoked)
    // console.log("noRevokes", JSON.stringify(revoked, null, 2))

    const noRevokes = granted
      .map(e => e.payload.value)
      .filter(e => {
        // console.log("---", JSON.stringify(e, null, 2))
        return !revoked.map(e => e.payload.value).includes(a => a.access === e.access && a.publicKey === e.publicKey)
      })

    // console.log("noRevokes", JSON.stringify(noRevokes, null, 2))
    let access = granted
      .map(e => e.payload.value)
      .reduce((res, g) => {
      // console.log("...", g)
      // TODO: check for matching access level also
      const x = revoked
        .map(e => e.payload.value)
        .find(r => r.access === g.access && r.publicKey === g.publicKey && r.after.clock.time >= g.after.clock.time)

      // console.log("revoked", JSON.stringify(x, null, 2))

      if (x) {
        if (res[g.access]) {
          res[g.access].delete(x.publicKey)
        }
        // delete res[x.access]
      } else {
        // console.log(".......................", JSON.stringify(g, null, 2), res[g.access])
        res[g.access] = res[g.access]
          ? new Set([...res[g.access], ...[g.publicKey]])
          : new Set([g.publicKey])
      }
      return res
    }, {})

    // let accessNames = revoked.reduce((res, e) => {
    //   res[e.payload.value.access] = e.payload.value.publicKey
    //   return res
    // }, {})

    // const access = granted.map(e => {
    //   return (granted && !revoked) granted.after.clock.ts < entry.clock.ts) &&
    //     (!revoked || revoked.after.clock.ts > entry.clock.ts)
    // })
    // console.log(">>", access)
    // console.log("!!!3", access)
    return access//.reduce((res, val) => res.add(val), new Set([])))
  }

  async hasAccessForEntry(access, entry) {
    const whereAccessLevelsAreEqual = e => Array.isArray(access) 
      ? access.includes(a => e.access === a)
      : e.access === access

    const wherePublicKeysAreEqual = e => e.publicKey === entry.identity.publicKey &&
      whereAccessLevelsAreEqual(e)

    const granted = Array.from(this._index.granted.values()).map(e => e.payload.value).find(wherePublicKeysAreEqual)

    const revoked = Array.from(this._index.revoked.values()).map(e => e.payload.value).find(wherePublicKeysAreEqual)
    // If access has been granted 
    // AND the entry after which the access was granted is 
    // BEFORE than the entry being added 
    // AND
    // access was not revoked 
    // OR if it was, the revocation happened
    // AFTER the entry being added happened
    // console.log("granted", granted, (granted !== undefined && granted.after.clock.time < entry.clock.time))
    // console.log("revoked", revoked, (revoked !== undefined ? revoked.after.clock.time >= entry.clock.time : false) === false)
    // if (revoked)
    //   console.log("revoked2", (revoked !== undefined ? revoked.after.clock.time < entry.clock.time : false) === true, revoked.after.clock.time < entry.clock.time, revoked.after.clock.time, entry.clock.time)
    // console.log("both", (granted !== undefined && granted.after.clock.time < entry.clock.time) &&
    //   (revoked !== undefined ? revoked.after.clock.time > entry.clock.time : false) === false)

    return ((granted !== undefined && granted.after.clock.time < entry.clock.time) &&
      (revoked !== undefined ? revoked.after.clock.time < entry.clock.time : false) === false) ||
      this.access.canAppend(entry, this.identity.provider)
  }

  async grant (access, identity, afterEntry) {
    if (!afterEntry) throw new Error('The argument afterEntry is required. Provide an entry after which this access has been granted.')

    return this._addOperation({
      op: 'GRANT',
      key: null,
      value: {
        publicKey: identity.publicKey,
        access: access,
        after: afterEntry
      },
    })
  }

  async revoke (access, identity, afterEntry) {
    if (!afterEntry) throw new Error('The arguments afterEntry is required. Provide an entry after which this access has been revoked.')

    return this._addOperation({
      op: 'REVOKE',
      key: null,
      value: {
        publicKey: identity.publicKey,
        access: access,
        after: afterEntry
      },
    })
  }
}

module.exports = AccessControllerStore
