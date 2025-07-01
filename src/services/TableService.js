import FirebaseService from './FirebaseService';

const TableService = {
  getTables: async () => {
    return FirebaseService.getTables();
  },

  updateTableStatus: async (tableId, status) => {
    return FirebaseService.updateTableStatus(tableId, status);
  },

  onTablesChange: (callback) => {
    return FirebaseService.onTablesChange(callback);
  },
  
  // Add a new table with the given capacity
  addTable: async (tableNumber, capacity) => {
    return FirebaseService.addTable({
      number: tableNumber.toString(),
      capacity: parseInt(capacity)
    });
  },
  
  // Remove a table from the system
  removeTable: async (tableId) => {
    return FirebaseService.removeTable(tableId);
  }
};

export default TableService;
