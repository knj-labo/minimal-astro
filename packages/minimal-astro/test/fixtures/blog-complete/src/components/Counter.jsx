import { useState } from 'react';

export default function Counter({ initialCount = 0, label = 'Count', testId = 'counter' }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div
      className="counter"
      data-testid={testId}
      style={{
        padding: '1rem',
        border: '2px solid #3498db',
        borderRadius: '8px',
        background: 'white',
        textAlign: 'center',
        margin: '1rem 0',
        maxWidth: '400px',
      }}
    >
      <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Interactive React Counter (Island)</h3>
      <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        {label}:{' '}
        <strong style={{ color: '#3498db' }} data-testid={`${testId}-value`}>
          {count}
        </strong>
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setCount(count - 1)}
          data-testid={`${testId}-decrement`}
          style={{
            padding: '0.5rem 1rem',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          -1
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          data-testid={`${testId}-reset`}
          style={{
            padding: '0.5rem 1rem',
            background: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setCount(count + 1)}
          data-testid={`${testId}-increment`}
          style={{
            padding: '0.5rem 1rem',
            background: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          +1
        </button>
      </div>
      <p
        style={{
          fontSize: '0.8rem',
          color: '#666',
          marginTop: '1rem',
          fontStyle: 'italic',
        }}
      >
        This component only loads JavaScript when needed! 🎉
      </p>
    </div>
  );
}
