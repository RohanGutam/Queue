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
  }
};

export default TableService;
