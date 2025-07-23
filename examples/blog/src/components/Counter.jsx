import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      marginBlock: '2rem'
    }}>
      <button
        onClick={() => setCount(count - 1)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer'
        }}
      >
        -
      </button>
      <span style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        minWidth: '3rem',
        textAlign: 'center'
      }}>
        {count}
      </span>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer'
        }}
      >
        +
      </button>
      <span style={{
        marginLeft: '1rem',
        color: '#666'
      }}>
        React Counter (client:load)
      </span>
    </div>
  );
}