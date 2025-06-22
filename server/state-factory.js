export default function stateFactory (changeCallback = () => {}) {
  const stateChangeHandler = {
    get (target, key) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], stateChangeHandler)
      }
      return target[key]
    },
    set (target, prop, value) {
      target[prop] = value
      if (target[prop] !== value) changeCallback(target)
      return true
    }
  }

  return new Proxy({
    downloading: {},
    summarizing: {}
  }, stateChangeHandler)
}
