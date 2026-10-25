// Run: npm test
import assert from 'node:assert/strict'
import { parseGradient } from '../src/gradient.ts'

assert.deepEqual(parseGradient('linear-gradient(45deg, #ff9a9e 0%, #fad0c4 100%)'), {
  type: 'linear', angle: 45, stops: [{ color: '#ff9a9e', position: 0 }, { color: '#fad0c4', position: 100 }],
})
assert.deepEqual(parseGradient('linear-gradient(to right, #00b09b 0%, #96c93d 100%)')?.angle, 90)
assert.deepEqual(parseGradient('radial-gradient(circle, rgba(0, 0, 0, 0.5) 10%, #fff 50%, red 90%)')?.stops, [
  { color: 'rgba(0, 0, 0, 0.5)', position: 10 }, { color: '#fff', position: 50 }, { color: 'red', position: 90 },
])
assert.deepEqual(parseGradient('conic-gradient(from 30deg, red, blue)'), {
  type: 'conic', angle: 30, stops: [{ color: 'red', position: 0 }, { color: 'blue', position: 100 }],
})
assert.equal(parseGradient('#ff0000'), null)
assert.equal(parseGradient('linear-gradient(90deg, red)'), null)
console.log('gradient parser OK')
