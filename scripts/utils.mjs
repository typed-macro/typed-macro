import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export function getExamples() {
  const examples = []
  readdirSync('./examples').forEach(name => {
    const filepath = join('./examples', name)
    if (statSync(filepath).isDirectory()) examples.push({
      name: name,
      path: filepath
    })
  })
  return examples
}
