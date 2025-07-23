import { useState } from 'react';

export default function ReactCounter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '10px' }}>
      <p>React Counter: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
