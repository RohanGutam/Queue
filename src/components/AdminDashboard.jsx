import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TableService from "../services/TableService";
import CustomerService from "../services/CustomerService";
import FirebaseService from "../services/FirebaseService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ show: true, message, type });

    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const handleRemoveCustomer = async (customerId) => {
    try {
      await CustomerService.removeCustomer(customerId);
      showToast("Customer removed from queue", "success");
    } catch (error) {
      console.error("Error removing customer:", error);
      showToast("Failed to remove customer", "error");
    }
  };

  const tryAssignTablesAutomatically = async () => {
    try {
      await CustomerService.tryAssignTablesAutomatically();
    } catch (error) {
      console.error("Error in automatic table assignment:", error);
      showToast("Failed to assign tables automatically. Please try again.");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeTables = null;
    let unsubscribeQueue = null;
    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        // Initialize tables if they don't exist
        await FirebaseService.initializeTables();
        console.log("Tables initialized successfully");

        // Set up real-time listeners
        unsubscribeTables = FirebaseService.onTablesChange((updatedTables) => {
          if (isMounted) {
            setTables(updatedTables);
            setLastUpdated(new Date());
            
            // Check if any tables became available
            const newlyAvailableTables = updatedTables.filter(
              table => table.status === "Available" && 
              !tables.find(t => t.id === table.id && t.status === "Available")
            );
            
            if (newlyAvailableTables.length > 0) {
              tryAssignTablesAutomatically();
            }
          }
        });

        unsubscribeQueue = CustomerService.onQueueChange((updatedCustomers) => {
          if (isMounted) {
            setCustomers(updatedCustomers);
            setLastUpdated(new Date());
          }
        });

        // Initial data fetch
        const [initialTables, initialCustomers] = await Promise.all([
          TableService.getTables(),
          CustomerService.getQueue()
        ]);

        if (isMounted) {
          setTables(initialTables);
          setCustomers(initialCustomers);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        if (isMounted) {
          showToast("Failed to load dashboard data. Please refresh the page.");
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    // Cleanup function
    return () => {
      isMounted = false;
      if (unsubscribeTables) {
        unsubscribeTables();
      }
      if (unsubscribeQueue) {
        unsubscribeQueue();
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  const handleAssignTable = async (customerId, tableId) => {
    try {
      const table = tables.find(t => t.id === tableId);
      await CustomerService.updateCustomerStatus(customerId, "Assigned", table.number);
      await TableService.updateTableStatus(tableId, "Occupied");
      showToast(`Customer assigned to Table ${table.number}`, "success");
    } catch (error) {
      console.error("Error assigning table:", error);
      showToast("Failed to assign table. Please try again.");
    }
  };

  const handleSeatCustomer = async (customerId, tableId) => {
    try {
      await CustomerService.updateCustomerStatus(customerId, "Seated", tableId);
      await TableService.updateTableStatus(tableId, "Occupied");
      showToast("Customer seated successfully.", "success");
    } catch (error) {
      console.error("Error seating customer:", error);
      showToast("Failed to seat customer. Please try again.");
    }
  };

  const handleCompleteService = async (tableId) => {
    try {
      const table = tables.find(t => t.id === tableId);
      await TableService.updateTableStatus(tableId, "Cleaning");
      showToast("Service completed. Table is being cleaned.", "success");
      
      setTimeout(async () => {
        await TableService.updateTableStatus(tableId, "Available");
        await tryAssignTablesAutomatically();
      }, 10000);
    } catch (error) {
      console.error("Error completing service:", error);
      showToast("Failed to update table status. Please try again.");
    }
  };

  const handleFreeTable = async (tableId) => {
    try {
      await TableService.updateTableStatus(tableId, "Available");
      await tryAssignTablesAutomatically();
      showToast("Table freed successfully", "success");
    } catch (error) {
      console.error("Error freeing table:", error);
      showToast("Failed to free table. Please try again.");
    }
  };

  const handleClearQueue = async () => {
    try {
      await CustomerService.clearQueue();
      showToast("Queue cleared successfully.", "success");
    } catch (error) {
      console.error("Error clearing queue:", error);
      showToast("Failed to clear queue. Please try again.");
    }
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleAuthenticate = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "admin1234") {
      setIsAuthenticated(true);
    } else {
      showToast("Invalid credentials. Try username: 'admin' and password: 'admin1234'");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Restaurant Admin Login</h1>

          {toast.show && (
            <p className="bg-red-600 p-2 mb-4 rounded text-white text-center">{toast.message}</p>
          )}

          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
            >
              Login
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleHome}
              className="text-gray-400 hover:text-white underline text-sm"
            >
              Back to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 rounded-md shadow-lg px-4 py-2 text-sm ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.message}
        </div>
      )}

      <nav className="bg-black shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">Bite-Buzz Admin Dashboard</h1>
        </div>

        <div className="flex space-x-6 items-center">
          <button
            onClick={handleHome}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Exit Admin
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col md:flex-row md:justify-between">
          <h2 className="text-2xl font-bold mb-4 md:mb-0">Queue Management</h2>

          <div className="flex space-x-4">
            <button
              onClick={handleClearQueue}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Clear Queue
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-700 p-4 border-b border-gray-600">
                <h3 className="text-lg font-semibold">Customer Queue</h3>
                <p className="text-sm text-gray-400 mt-1">Customers are automatically seated when tables become available</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Party
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Wait Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {customers
                      .filter(customer => !customer.status || customer.status === "Waiting")
                      .map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-400">{customer.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {customer.partySize || customer.tableFor || 1} people
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{customer.waitTime || "N/A"} min</div>
                            <div className="text-xs text-gray-400">
                              Since {new Date(customer.timestamp?.toDate?.() || customer.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-800 text-yellow-200">
                              Waiting
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRemoveCustomer(customer.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}

                    {customers.filter(c => !c.status || c.status === "Waiting").length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                          No customers in queue
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-700 p-4 border-b border-gray-600">
                <h3 className="text-lg font-semibold">Tables Status</h3>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className={`p-3 rounded-lg shadow ${
                        table.status === "Available"
                          ? "bg-green-900"
                          : table.status === "Occupied"
                          ? "bg-red-900"
                          : table.status === "Reserved"
                          ? "bg-blue-900"
                          : "bg-yellow-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">Table {table.number}</span>
                        <span className="text-xs rounded-full px-2 py-0.5 bg-black bg-opacity-30">
                          {table.capacity} {table.capacity === 1 ? "person" : "people"}
                        </span>
                      </div>

                      <div className="text-sm mb-2">{table.status}</div>

                      {table.occupiedSince && (
                        <div className="text-xs opacity-80">
                          Since {new Date(table.occupiedSince).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </div>
                      )}

                      {table.status === "Occupied" && (
                        <button
                          onClick={() => handleCompleteService(table.id)}
                          className="mt-2 w-full text-xs bg-black bg-opacity-30 hover:bg-opacity-40 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}

                      {table.status === "Reserved" && (
                        <button
                          onClick={() => handleFreeTable(table.id)}
                          className="mt-2 w-full text-xs bg-black bg-opacity-30 hover:bg-opacity-40 py-1 rounded"
                        >
                          Free Table
                        </button>
                      )}
                    </div>
                  ))}

                  {tables.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-8">
                      No tables available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 p-2 text-center text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()} • Updates automatically
        </div>
      </div>
    </div>
  );
}