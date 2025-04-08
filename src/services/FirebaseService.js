// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, updateDoc, addDoc, onSnapshot, serverTimestamp, setDoc, writeBatch, deleteDoc, query, where, orderBy, runTransaction } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_iRbWfZltl26EGPtA6vOt_BdurUE5b_M",
  authDomain: "queue-d0180.firebaseapp.com",
  projectId: "queue-d0180",
  storageBucket: "queue-d0180.firebasestorage.app",
  messagingSenderId: "58702351087",
  appId: "1:58702351087:web:27d35f0af2b47b0698a91a",
  measurementId: "G-70HZWEXT73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FirebaseService = {
  // Initialize tables if they don't exist
  initializeTables: async () => {
    try {
      const tablesSnapshot = await getDocs(collection(db, "tables"));
      if (tablesSnapshot.empty) {
        // Create initial tables with specified capacities
        const initialTables = [
          { number: "1", capacity: 2, status: "Available" },
          { number: "2", capacity: 2, status: "Available" },
          { number: "3", capacity: 4, status: "Available" },
          { number: "4", capacity: 4, status: "Available" },
          { number: "5", capacity: 6, status: "Available" },
          { number: "6", capacity: 6, status: "Available" },
          { number: "7", capacity: 6, status: "Available" },
          { number: "8", capacity: 8, status: "Available" },
          { number: "9", capacity: 8, status: "Available" },
          { number: "10", capacity: 10, status: "Available" }
        ];

        for (const table of initialTables) {
          await addDoc(collection(db, "tables"), {
            ...table,
            occupiedSince: null,
            createdAt: serverTimestamp()
          });
        }
        console.log("Initial tables created successfully");
      }
    } catch (error) {
      console.error("Error initializing tables:", error);
      throw error;
    }
  },

  // Tables collection
  getTables: async () => {
    try {
      const tablesSnapshot = await getDocs(collection(db, "tables"));
      return tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching tables:", error);
      return [];
    }
  },

  updateTableStatus: async (tableId, status) => {
    try {
      const tableRef = doc(db, "tables", tableId);
      const updateData = { status };
      
      if (status === "Occupied") {
        updateData.occupiedSince = new Date().toISOString();
      } else if (status === "Available") {
        updateData.occupiedSince = null;
      }
      
      await updateDoc(tableRef, updateData);
    } catch (error) {
      console.error("Error updating table status:", error);
      throw error;
    }
  },

  // Customers collection
  joinQueue: async (customerData) => {
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        ...customerData,
        timestamp: serverTimestamp(),
        status: "Waiting",
        tableNumber: null
      });
      return { id: docRef.id, ...customerData };
    } catch (error) {
      console.error("Error joining queue:", error);
      throw error;
    }
  },

  getQueue: async () => {
    try {
      const queueSnapshot = await getDocs(collection(db, "customers"));
      return queueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching queue:", error);
      return [];
    }
  },

  updateCustomerStatus: async (customerId, status, tableNumber = null) => {
    try {
      const customerRef = doc(db, "customers", customerId);
      const updateData = { status };
      
      if (tableNumber) {
        updateData.tableNumber = tableNumber;
      }
      
      await updateDoc(customerRef, updateData);
    } catch (error) {
      console.error("Error updating customer status:", error);
      throw error;
    }
  },

  clearQueue: async () => {
    try {
      const queueSnapshot = await getDocs(collection(db, "customers"));
      const batch = writeBatch(db);
      
      queueSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error clearing queue:", error);
      throw error;
    }
  },

  // Real-time listeners
  onTablesChange: (callback) => {
    const tablesRef = collection(db, "tables");
    return onSnapshot(tablesRef, (snapshot) => {
      const tables = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        occupiedSince: doc.data().occupiedSince ? new Date(doc.data().occupiedSince) : null
      }));
      callback(tables);
    }, (error) => {
      console.error("Error in tables listener:", error);
    });
  },

  onQueueChange: (callback) => {
    const queueRef = collection(db, "customers");
    const q = query(queueRef, orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      const queue = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      callback(queue);
    }, (error) => {
      console.error("Error in queue listener:", error);
    });
  },

  removeCustomer: async (customerId) => {
    try {
      const customerRef = doc(db, "customers", customerId);
      await deleteDoc(customerRef);
    } catch (error) {
      console.error("Error removing customer:", error);
      throw error;
    }
  },

  // New method to assign table with transaction
  assignTableWithTransaction: async (customerId, tableId) => {
    const db = getFirestore();
    try {
      await runTransaction(db, async (transaction) => {
        // Get the table document
        const tableRef = doc(db, "tables", tableId);
        const tableDoc = await transaction.get(tableRef);
        
        if (!tableDoc.exists()) {
          throw new Error("Table does not exist");
        }

        const tableData = tableDoc.data();
        
        // Check if table is available
        if (tableData.status !== "Available") {
          throw new Error("Table is not available");
        }

        // Get the customer document
        const customerRef = doc(db, "customers", customerId);
        const customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          throw new Error("Customer does not exist");
        }

        const customerData = customerDoc.data();
        
        // Check if customer is already assigned to a table
        if (customerData.status === "Assigned") {
          throw new Error("Customer is already assigned to a table");
        }

        // Update both documents in the same transaction
        transaction.update(tableRef, {
          status: "Occupied",
          occupiedSince: new Date().toISOString()
        });

        transaction.update(customerRef, {
          status: "Assigned",
          tableNumber: tableData.number,
          assignedAt: new Date().toISOString()
        });
      });

      return true;
    } catch (error) {
      console.error("Error in table assignment transaction:", error);
      throw error;
    }
  }
};

export default FirebaseService; 