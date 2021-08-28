import { defineComponent } from 'vue'
import { $ref } from '@ref-sugar'

export default defineComponent(() => {
  let count = $ref<number>(0)
  return () => (
    <div>
      <p>
        <button onClick={() => count++}>Add 1</button>
      </p>
      <p>{count}</p>
    </div>
  )
})
