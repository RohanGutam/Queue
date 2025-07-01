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
  
  // Add a new table to the database
  addTable: async (tableData) => {
    try {
      // Create table in database
      const docRef = await addDoc(collection(db, "tables"), {
        ...tableData,
        occupiedSince: null,
        status: "Available",
        createdAt: serverTimestamp()
      });
      
      // Return complete table object
      return { 
        id: docRef.id, 
        ...tableData,
        status: "Available" 
      };
    } catch (error) {
      console.error("Error adding table:", error);
      throw error;
    }
  },

  // Remove a table from the database
  removeTable: async (tableId) => {
    try {
      const tableRef = doc(db, "tables", tableId);
      await deleteDoc(tableRef);
      return true;
    } catch (error) {
      console.error("Error removing table:", error);
      throw error;
    }
  },
  
  // Customers collection
  joinQueue: async (customerData) => {
    try {
      // Fixed initial wait time for all customers
      const INITIAL_WAIT_TIME = 7; // 7 minutes initial wait
      
      // Create customer in database with server timestamps
      const docRef = await addDoc(collection(db, "customers"), {
        ...customerData,
        timestamp: serverTimestamp(),
        status: "Waiting",
        tableNumber: null,
        waitTime: INITIAL_WAIT_TIME,
        waitTimeInitial: INITIAL_WAIT_TIME,
        waitTimeUpdatedAt: serverTimestamp(),
        lastUpdateTime: serverTimestamp()
      });
      
      // Return complete customer object
      return { 
        id: docRef.id, 
        ...customerData,
        waitTime: INITIAL_WAIT_TIME,
        waitTimeInitial: INITIAL_WAIT_TIME,
        status: "Waiting"
      };
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
  },  onQueueChange: (callback) => {
    const queueRef = collection(db, "customers");
    const q = query(queueRef, orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      const queue = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Get basic timestamp
        const timestamp = data.timestamp?.toDate?.() || new Date();
        
        // Calculate accurate wait time based on server timestamp
        let waitTime = data.waitTime || 7; // Default to 7 if not set
        let shouldReset = false;
        
        // If we have a waitTimeUpdatedAt timestamp, calculate the elapsed time
        if (data.waitTimeUpdatedAt && data.waitTimeUpdatedAt.toDate) {
          const updatedAt = data.waitTimeUpdatedAt.toDate();
          const now = new Date();
          
          // Calculate minutes elapsed since last update (using precise millisecond calculation)
          const elapsedMinutes = (now - updatedAt) / (1000 * 60);
          
          // Subtract elapsed time from stored wait time
          waitTime = Math.max(0, waitTime - elapsedMinutes);
          
          // Flag if timer should be reset (using consistent threshold of 0.05 minutes = 3 seconds)
          shouldReset = (waitTime <= 0.05);
          
          // If timer reached zero, reset to 3 minutes
          // Only reset if it was recently at zero (within last 30 seconds)
          if (shouldReset && elapsedMinutes <= 0.5) {
            waitTime = 3;
          }
        }
          // Return customer with calculated wait time
        return {
          id: doc.id,
          ...data,
          timestamp,
          calculatedWaitTime: waitTime, // Add calculated time as separate property
          waitTime: data.waitTime || 7, // Keep original stored time
          shouldResetTimer: shouldReset, // Add reset flag for consistent behavior
          lastUpdateTime: data.lastUpdateTime?.toDate?.() || timestamp
        };
      });
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
  },
  // Centralized timer management
  updateCustomerWaitTime: async (customerId, newWaitTime) => {
    try {
      // Validate wait time value
      let validWaitTime = newWaitTime;
      
      // Ensure it's a number and in valid range
      if (typeof validWaitTime !== 'number' || isNaN(validWaitTime)) {
        validWaitTime = 7; // Default to 7 if invalid
      }
      
      // Reset to exactly 3 minutes if timer reached zero or is very close to zero
      if (validWaitTime <= 0.05) {
        validWaitTime = 3;
        console.log(`Timer for customer ${customerId} has been reset to 3 minutes`);
      }
      
      // Clamp between 0 and 7 minutes to prevent invalid values
      validWaitTime = Math.min(7, Math.max(0, validWaitTime));
      
      const customerRef = doc(db, "customers", customerId);
      
      // Add flag for reset if this was a reset operation
      const updateData = {
        waitTime: validWaitTime,
        waitTimeUpdatedAt: serverTimestamp(),
        lastWaitTimeUpdate: new Date().toISOString(),
        // Add the timer reset flag for better cross-client synchronization
        timerReset: validWaitTime === 3 && newWaitTime <= 0.05
      };
      
      await updateDoc(customerRef, updateData);
      
      return validWaitTime;
    } catch (error) {
      console.error("Error updating customer wait time:", error);
      throw error;
    }
  },
  
  // Get precise server time
  getServerTime: async () => {
    try {
      // Create a temporary document with server timestamp
      const docRef = await addDoc(collection(db, "_timeSync"), {
        timestamp: serverTimestamp()
      });
      
      // Read the document to get the server time
      const docSnap = await getDocs(doc(db, "_timeSync", docRef.id));
      const serverTime = docSnap.data().timestamp.toDate();
      
      // Clean up the temporary document
      await deleteDoc(docRef);
      
      return serverTime;
    } catch (error) {
      console.error("Error getting server time:", error);
      // Return local time as fallback
      return new Date();
    }
  },    onSingleCustomerChange: (customerId, callback) => {
    const customerRef = doc(db, "customers", customerId);
    return onSnapshot(customerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // Get basic timestamp
        const timestamp = data.timestamp?.toDate?.() || new Date();
        
        // Calculate accurate wait time based on server timestamp
        let waitTime = data.waitTime || 7; // Default to 7 if not set
        let shouldReset = false;
        
        // Check for explicit timer reset flag from database updates
        if (data.timerReset === true) {
          // Timer was explicitly reset by another client
          shouldReset = true;
          waitTime = 3; // Use the reset value directly
          console.log(`Timer reset detected for customer ${customerId} from database flag`);
        }
        // Otherwise calculate based on elapsed time
        else if (data.waitTimeUpdatedAt && data.waitTimeUpdatedAt.toDate) {
          const updatedAt = data.waitTimeUpdatedAt.toDate();
          const now = new Date();
          
          // Calculate minutes elapsed since last update with precise milliseconds
          const elapsedMinutes = (now - updatedAt) / (1000 * 60);
          
          // Subtract elapsed time from stored wait time
          waitTime = Math.max(0, waitTime - elapsedMinutes);
          
          // Detect if timer should be reset using consistent threshold (0.05)
          shouldReset = (waitTime <= 0.05);
          
          // If timer reached zero, reset to 3 minutes
          // Only reset if it was recently at zero (within last 30 seconds)
          if (shouldReset && elapsedMinutes <= 0.5) {
            waitTime = 3;
            console.log(`Timer automatically reset for customer ${customerId} based on elapsed time`);
          }
        }
          // Return customer with calculated wait time and synchronized reset information
        callback({
          id: doc.id,
          ...data,
          timestamp,
          calculatedWaitTime: waitTime, // Add calculated time as separate property
          waitTime: data.waitTime || 7, // Keep original stored time
          shouldResetTimer: shouldReset || data.timerReset === true, // Reset flag based on calculation or explicit flag
          timerWasReset: data.timerReset === true, // Flag indicating if timer was explicitly reset
          lastUpdateTime: data.lastUpdateTime?.toDate?.() || timestamp
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error in customer ${customerId} listener:`, error);
    });
  },
};

export default FirebaseService;