import FirebaseService from './FirebaseService';

const CustomerService = {
  joinQueue: async (customerData) => {
    try {
      // First, check if there's an available table
      const tables = await FirebaseService.getTables();
      const availableTables = tables.filter(t => t.status === "Available");
      
      // Find a suitable table for the customer
      const partySize = customerData.partySize || customerData.tableFor || 1;
      const suitableTable = availableTables
        .filter(table => table.capacity >= partySize)
        .sort((a, b) => a.capacity - b.capacity)[0]; // Get the smallest suitable table

      if (suitableTable) {
        // If a suitable table is available, first add the customer to the queue
        const customer = await FirebaseService.joinQueue({
          ...customerData,
          status: "Waiting", // Initially set as waiting
          tableNumber: null,
          joinedAt: new Date().toISOString()
        });

        try {
          // Try to assign the table using transaction
          await FirebaseService.assignTableWithTransaction(customer.id, suitableTable.id);
          
          return {
            ...customer,
            status: "Assigned",
            message: `Assigned to Table ${suitableTable.number}`,
            tableNumber: suitableTable.number
          };
        } catch (error) {
          // If table assignment fails, customer remains in queue
          return {
            ...customer,
            message: "Added to queue. You will be assigned a table when one becomes available.",
            estimatedWaitTime: 0
          };
        }
      } else {
        // If no suitable table is available, add to queue
        const customer = await FirebaseService.joinQueue({
          ...customerData,
          status: "Waiting",
          tableNumber: null,
          joinedAt: new Date().toISOString()
        });
        
        // Calculate estimated wait time (5 minutes per person ahead in queue)
        const waitingCustomers = await FirebaseService.getQueue();
        const customersAhead = waitingCustomers.filter(c => 
          c.status === "Waiting" && 
          new Date(c.joinedAt || c.timestamp) < new Date(customer.joinedAt || customer.timestamp)
        ).length;
        
        const estimatedWaitTime = customersAhead * 5; // 5 minutes per person
        
        return {
          ...customer,
          message: "Added to queue. You will be assigned a table when one becomes available.",
          estimatedWaitTime,
          positionInQueue: customersAhead + 1
        };
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      throw error;
    }
  },

  getQueue: async () => {
    return FirebaseService.getQueue();
  },

  updateCustomerStatus: async (customerId, status, tableNumber = null) => {
    return FirebaseService.updateCustomerStatus(customerId, status, tableNumber);
  },

  clearQueue: async () => {
    return FirebaseService.clearQueue();
  },

  onQueueChange: (callback) => {
    return FirebaseService.onQueueChange(callback);
  },

  removeCustomer: async (customerId) => {
    return FirebaseService.removeCustomer(customerId);
  },

  // Updated method to try assigning tables automatically
  tryAssignTablesAutomatically: async () => {
    try {
      // Get current state of tables and customers
      const [tables, customers] = await Promise.all([
        FirebaseService.getTables(),
        FirebaseService.getQueue()
      ]);

      // Get available tables and waiting customers
      const availableTables = tables.filter(t => t.status === "Available");
      const waitingCustomers = customers
        .filter(c => c.status === "Waiting")
        .sort((a, b) => {
          const timeA = new Date(a.joinedAt || a.timestamp);
          const timeB = new Date(b.joinedAt || b.timestamp);
          return timeA - timeB;
        });

      // Process one customer at a time
      for (const customer of waitingCustomers) {
        const partySize = customer.partySize || customer.tableFor || 1;
        
        // Find the smallest suitable table
        const suitableTable = availableTables
          .filter(table => table.capacity >= partySize)
          .sort((a, b) => a.capacity - b.capacity)[0];

        if (suitableTable) {
          try {
            // Try to assign the table using transaction
            await FirebaseService.assignTableWithTransaction(customer.id, suitableTable.id);
            
            // If successful, remove the table from available tables
            const tableIndex = availableTables.findIndex(t => t.id === suitableTable.id);
            if (tableIndex !== -1) {
              availableTables.splice(tableIndex, 1);
            }
          } catch (error) {
            console.error(`Error assigning table to customer ${customer.id}:`, error);
            // Continue with next customer if there's an error
            continue;
          }
        }
      }
    } catch (error) {
      console.error("Error in automatic table assignment:", error);
      throw error;
    }
  }
};

export default CustomerService;
