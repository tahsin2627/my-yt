export default function retry (fnPromise, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      fnPromise()
        .then(resolve)
        .catch(async (error) => {
          if (n === 1) {
            console.error('All attempts failed', error)
            reject(error)
          } else {
            console.log(`Retrying... (${n - 1} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, 3000))
            attempt(n - 1)
          }
        })
    }
    attempt(retries)
  })
}
