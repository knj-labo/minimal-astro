import { useState } from 'react';

export function Counter({ initialCount = 0 }: { initialCount?: number }) {
    const [count, setCount] = useState(initialCount);

    return (
        <div className="p-4 border-2 border-blue-500 rounded">
            <div className="text-2xl text-center mb-2">Count: {count}</div>
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => setCount(count - 1)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    -
                </button>
                <button
                    onClick={() => setCount(count + 1)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    +
                </button>
            </div>
        </div>
    );
}