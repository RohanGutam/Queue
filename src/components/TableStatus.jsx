import React from "react";

const TableStatus = ({ index, table, onEnd }) => {
  return (
    <div className={`p-4 border rounded-lg text-center ${table.status === "Occupied" ? "bg-red-400" : "bg-green-400"}`}>
      <h2 className="text-lg font-semibold">Table {table.tableNumber}</h2> {/* ✅ Show table number */}
      <p>Status: {table.status}</p>
      <p>Capacity: {table.capacity}</p>
      {table.status === "Occupied" && (
        <button onClick={() => onEnd(index)} className="mt-2 px-4 py-1 bg-black text-white rounded">
          END
        </button>
      )}
    </div>
  );
};

export default TableStatus;
