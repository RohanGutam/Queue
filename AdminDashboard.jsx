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
  const waitTimeIntervalsRef = useRef({});
  // State to track wait times for UI display
  const [displayWaitTimes, setDisplayWaitTimes] = useState({});
  const timerIntervalRef = useRef(null);
  const updateIntervalsRef = useRef({});
  const lastDatabaseUpdateRef = useRef({});
  // State for add table modal
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableCapacity, setNewTableCapacity] = useState(2);
  // State to track which table's menu is open
  const [activeTableMenu, setActiveTableMenu] = useState(null);
  // Ref for detecting clicks outside the menu
  const menuRef = useRef(null);
  
  // Initialize lastDatabaseUpdateRef
  useEffect(() => {
    lastDatabaseUpdateRef.current = {};
  }, []);

  // Close table menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeTableMenu !== null && menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveTableMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeTableMenu]);

  // Helper function to format wait time
  const formatWaitTime = (waitTimeInMinutes) => {
    if (waitTimeInMinutes === null || waitTimeInMinutes === undefined || isNaN(waitTimeInMinutes)) {
      return "N/A";
    }
    
    // Ensure non-negative value
    const time = Math.max(0, waitTimeInMinutes);
    
    // Calculate minutes and seconds
    const minutes = Math.floor(time);
    const seconds = Math.floor((time - minutes) * 60);
    
    // Format with leading zeros
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} min`;
  };

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
      
      // Clear all wait time intervals
      Object.values(waitTimeIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [isAuthenticated]);
  // State to track local wait times when customers change
  const [localWaitTimes, setLocalWaitTimes] = useState({});
  const dbUpdateIntervalRef = useRef(null);
  
  // Initialize local wait times when customers change
  useEffect(() => {
    const waitingCustomers = customers.filter(customer => !customer.status || customer.status === "Waiting");
    
    // Initialize local wait times from customer data
    const initialWaitTimes = {};
    waitingCustomers.forEach(customer => {
      initialWaitTimes[customer.id] = customer.waitTime || 7;
    });
    
    setLocalWaitTimes(prev => ({...prev, ...initialWaitTimes}));
  }, [customers]);  // We've removed the older timer implementation here, as it was duplicating logic
  // and potentially causing sync issues. The new implementation in the "Timer management effect"
  // and "Individual customer timer listener effect" sections provides a more synchronized
  // approach that better matches the UserInputForm.jsx implementation.
  
  // Initializer for display wait times
  useEffect(() => {
    // Update display wait times when customers change
    const waitingCustomers = customers.filter(c => !c.status || c.status === "Waiting");
    
    // Initialize from the calculated wait times
    const initialTimes = {};
    waitingCustomers.forEach(customer => {
      if (customer.id) {
        initialTimes[customer.id] = customer.calculatedWaitTime !== undefined ? 
          customer.calculatedWaitTime : (customer.waitTime || 7);
      }
    });
    
    // Set initial values
    setDisplayWaitTimes(prev => ({...prev, ...initialTimes}));
    
  }, [customers.filter(c => !c.status || c.status === "Waiting").map(c => c.id).join(',')]);
  // Timer management effect - synchronize with user view
  useEffect(() => {
    // Get all waiting customers
    const waitingCustomers = customers.filter(c => !c.status || c.status === "Waiting");
    
    // Initialize display times from calculated wait times in customer data
    const initialTimes = {};
    waitingCustomers.forEach(customer => {
      // Use calculated time if available, otherwise use stored time
      // This matches the exact logic used in UserInputForm.jsx
      initialTimes[customer.id] = customer.calculatedWaitTime !== undefined ? 
        customer.calculatedWaitTime : (customer.waitTime || 7);
    });
    
    setDisplayWaitTimes(prev => ({...prev, ...initialTimes}));
    
    // Clear existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Start new timer that updates every second - same interval as UserInputForm
    timerIntervalRef.current = setInterval(() => {
      setDisplayWaitTimes(prev => {
        const updated = {...prev};
        const now = new Date();
        
        // Update each customer's time
        waitingCustomers.forEach(customer => {
          if (!customer.id) return;
          
          // Get current display time for this customer
          const currentTime = updated[customer.id];
          if (currentTime === undefined) return;
          
          // Decrease by exactly 1 second (1/60 of a minute) - same as UserInputForm
          const newTime = Math.max(0, currentTime - 1/60);
          
          // Use same reset threshold (0.05 minutes = 3 seconds) as in FirebaseService and UserInputForm
          if (newTime <= 0.05) {
            console.log(`Admin dashboard timer reset to 3 minutes for customer ${customer.id}`);
            
            // Reset to 3 minutes
            updated[customer.id] = 3;
            
            // Update database
            CustomerService.updateWaitTime(customer.id, 3)
              .catch(err => console.error(`Error resetting timer for ${customer.id}:`, err));
          } else {
            // Regular countdown
            updated[customer.id] = newTime;
            
            // Update database every 5 seconds - same interval as UserInputForm
            if (!lastDatabaseUpdateRef.current[customer.id] ||
                (now - lastDatabaseUpdateRef.current[customer.id]) > 5000) {
              CustomerService.updateWaitTime(customer.id, newTime)
                .catch(err => console.error(`Error updating timer for ${customer.id}:`, err));
              
              // Record update time
              lastDatabaseUpdateRef.current[customer.id] = now;
            }
          }
        });
        
        return updated;
      });
    }, 1000); // Run every second for smooth UI - same as UserInputForm
    
    // Clean up
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [customers.filter(c => !c.status || c.status === "Waiting").map(c => c.id).join(',')]);
    // Individual customer timer listener effect 
  useEffect(() => {
    const waitingCustomers = customers.filter(c => !c.status || c.status === "Waiting");
    const unsubscribers = {};
    
    // Set up listeners for individual customers
    waitingCustomers.forEach(customer => {
      if (!customer.id) return;
      
      // Create listener for this customer
      unsubscribers[customer.id] = CustomerService.onSingleCustomerChange(
        customer.id,
        (updatedCustomer) => {
          if (!updatedCustomer) return;
          
          // If database has a different time than our display, update display
          if (updatedCustomer.calculatedWaitTime !== undefined) {
            const currentDisplayTime = displayWaitTimes[customer.id];
            const timeDifference = Math.abs(
              (currentDisplayTime || 0) - updatedCustomer.calculatedWaitTime
            );
            
            // If significant difference (more than 2 seconds), sync with server
            // Using smaller threshold (0.033 minutes = ~2 seconds) to match UserInputForm
            if (timeDifference > 0.033) {
              console.log(`Admin dashboard syncing timer for customer ${customer.id}: ${updatedCustomer.calculatedWaitTime}`);
              setDisplayWaitTimes(prev => ({
                ...prev,
                [customer.id]: updatedCustomer.calculatedWaitTime
              }));
            }
              // Handle reset signal from server or other clients
            // Force immediate reset if timerWasReset is true (explicit reset)
            if (updatedCustomer.timerWasReset === true || updatedCustomer.shouldResetTimer) {
              console.log(`Admin dashboard received timer reset signal for customer ${customer.id}`);
              setDisplayWaitTimes(prev => ({
                ...prev,
                [customer.id]: 3
              }));
              
              // Clear the timer reset flag if it was explicitly set
              if (updatedCustomer.timerWasReset === true) {
                // Small delay to ensure all clients have processed the reset
                setTimeout(() => {
                  CustomerService.updateWaitTime(customer.id, 3)
                    .catch(err => console.error(`Error updating reset timer for ${customer.id}:`, err));
                }, 1000);
              }
            }
          }
        }
      );
    });
    
    // Clean up listeners
    return () => {
      Object.values(unsubscribers).forEach(unsub => {
        if (unsub) unsub();
      });
    };
  }, [customers.filter(c => !c.status || c.status === "Waiting").map(c => c.id).join(',')]);

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
      }, 2000);
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

  const handleAddTable = async () => {
    try {
      // Get the next table number by finding the highest current number and adding 1
      const nextTableNumber = tables.length > 0 
        ? Math.max(...tables.map(table => parseInt(table.number))) + 1 
        : 1;

      await TableService.addTable(nextTableNumber, newTableCapacity);
      setShowAddTableModal(false);
      showToast(`Table ${nextTableNumber} added successfully`, "success");
    } catch (error) {
      console.error("Error adding table:", error);
      showToast("Failed to add table. Please try again.");
    }
  };

  const handleRemoveTable = async (tableId) => {
    try {
      const table = tables.find(t => t.id === tableId);
      
      // Only allow removing if table is available (not occupied or reserved)
      if (table.status !== "Available") {
        showToast(`Cannot remove Table ${table.number} because it is ${table.status.toLowerCase()}`, "error");
        return;
      }
      
      await TableService.removeTable(tableId);
      showToast(`Table ${table.number} removed successfully`, "success");
      setActiveTableMenu(null);
    } catch (error) {
      console.error("Error removing table:", error);
      showToast("Failed to remove table. Please try again.");
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
      showToast("Wrong credentials");
    }
  };

  // Close table menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveTableMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 bg-opacity-60 backdrop-blur-lg flex flex-col">
        {/* Navigation Bar */}
        <nav className="fixed top-0 right-0 z-50 p-4 flex justify-end w-full">
          <div className="bg-black bg-opacity-70 rounded-lg shadow-lg px-6 py-2 flex space-x-6">
            <button 
              onClick={handleHome}
              className="text-white hover:text-red-400 font-medium transition-colors"
            >
              Home
            </button>
          </div>
        </nav>

        <div className="flex-1 flex justify-center items-center pt-16">
          <div className="bg-gray-300 shadow-2xl rounded-lg p-8 w-96 relative text-center">
            <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">Restaurant Admin Login</h2>

            {toast.show && (
              <p className="text-red-500 text-center mb-3">{toast.message}</p>
            )}

            <form onSubmit={handleAuthenticate} className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full px-3 py-2 border rounded-lg bg-black text-white placeholder-gray-400 shadow-md"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-3 py-2 border rounded-lg bg-black text-white placeholder-gray-400 shadow-md"
              />

              <button
                type="submit"
                className="w-full px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md"
              >
                LOGIN
              </button>
            </form>
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
                          </td>                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-yellow-400 font-semibold">{formatWaitTime(displayWaitTimes[customer.id] !== undefined ? displayWaitTimes[customer.id] : customer.waitTime)}</div>
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
                <button
                  onClick={() => setShowAddTableModal(true)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mt-1 flex items-center"
                >
                  <span className="mr-1 font-bold">+</span> Add Table
                </button>
              </div>              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...tables]
                    .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                    .map((table) => (
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
                        <div className="flex items-center">
                          <span className="text-xs rounded-full px-2 py-0.5 bg-black bg-opacity-30 mr-2">
                            {table.capacity} {table.capacity === 1 ? "person" : "people"}
                          </span>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveTableMenu(activeTableMenu === table.id ? null : table.id)}
                              className="text-white hover:bg-black hover:bg-opacity-20 rounded-full p-1"
                            >
                              <span className="inline-block leading-none">&#8942;</span>
                            </button>
                            {activeTableMenu === table.id && (
                              <div 
                                ref={menuRef}
                                className="absolute z-10 right-0 mt-1 w-36 bg-gray-800 rounded-md shadow-lg py-1"
                              >
                                <button
                                  onClick={() => handleRemoveTable(table.id)}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  Remove Table
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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

        {/* <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 p-2 text-center text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()} • Updates automatically
        </div> */}
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Add New Table</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Table Capacity</label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 4, 6, 8, 10, 12].map((size) => (
                  <button
                    key={size}
                    onClick={() => setNewTableCapacity(size)}
                    className={`py-2 rounded-md ${
                      newTableCapacity === size 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button 
                onClick={() => setShowAddTableModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTable}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}