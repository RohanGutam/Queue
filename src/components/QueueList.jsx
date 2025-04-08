import React from "react";

const QueueList = ({ queue, onClearQueue }) => {
  return (
    <div className="bg-white p-4 shadow-lg rounded-lg">
      <h2 className="text-xl font-semibold mb-3">Queue List</h2>
      {queue.length === 0 ? (
        <p>No customers in queue</p>
      ) : (
        <ul>
          {queue.map((person, index) => (
            <li key={index} className="p-2 border-b">
              {person.name} - {person.groupSize} people - {person.status}
            </li>
          ))}
        </ul>
      )}
      
      {/* Clear Queue Button */}
      {queue.length > 0 && (
        <button
          onClick={onClearQueue}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Queue
        </button>
      )}
    </div>
  );
};

export default QueueList;
