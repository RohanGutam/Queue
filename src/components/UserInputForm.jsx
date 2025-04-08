import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomerService from "../services/CustomerService";

export default function UserInputForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    tableFor: "1",
  });
  const [submitted, setSubmitted] = useState(false);
  const [queueStatus, setQueueStatus] = useState("Waiting in queue...");
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [countdown, setCountdown] = useState(180); // 3-minute timer
  const [tableAssigned, setTableAssigned] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulates websocket connection to update queue status
  useEffect(() => {
    if (submitted) {
      // Timer countdown
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // Simulate potential table assignment after random time
      const assignmentTimeout = setTimeout(() => {
        // Randomly decide if table is assigned (for demo purposes)
        if (Math.random() > 0.5) {
          setTableAssigned(Math.floor(Math.random() * 20) + 1);
        }
      }, Math.random() * 10000 + 5000);

      return () => {
        clearInterval(timer);
        clearTimeout(assignmentTimeout);
      };
    }
  }, [submitted]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      // Allow only numbers
      const numericValue = value.replace(/[^\d]/g, "");

      // Limit to 10 digits
      const truncatedValue = numericValue.slice(0, 10);

      setFormData({ ...formData, [name]: truncatedValue });

      // Validate phone number
      if (truncatedValue.length !== 0 && truncatedValue.length !== 10) {
        setPhoneError("Phone number must be exactly 10 digits");
      } else {
        setPhoneError("");
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await CustomerService.joinQueue({
        name: formData.name,
        phone: formData.phone,
        partySize: parseInt(formData.tableFor),
        timestamp: new Date()
      });

      setCustomer(result);
      setShowForm(false);
      setLoading(false);

      // Set up real-time listener for this customer
      const unsubscribe = CustomerService.onQueueChange((updatedCustomers) => {
        const updatedCustomer = updatedCustomers.find(c => c.id === result.id);
        if (updatedCustomer) {
          setCustomer(prev => ({
            ...prev,
            ...updatedCustomer,
            status: updatedCustomer.status,
            tableNumber: updatedCustomer.tableNumber
          }));
        }
      });

      return () => unsubscribe();
    } catch (error) {
      setError("Failed to join queue. Please try again.");
      setLoading(false);
    }
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleJoinQueue = () => {
    navigate("/queue");
  };

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
          <button 
            onClick={handleJoinQueue}
            className="text-white hover:text-red-400 font-medium transition-colors"
          >
            Join Queue
          </button>
        </div>
      </nav>

      <div className="flex-1 flex justify-center items-center pt-16">
        <div className="bg-gray-300 shadow-2xl rounded-lg p-8 w-96 relative text-center">
          <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">Join the Queue</h2>

          {errorMessage && (
            <p className="text-red-500 text-center mb-3">{errorMessage}</p>
          )}

          {submitted ? (
            <div className="text-center">
              <p className="text-green-600 font-bold">Joined Queue Successfully!</p>
              {tableAssigned ? (
                <p className="mt-2 text-blue-500 font-semibold">
                  Please proceed to Table No: {tableAssigned}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-blue-500 font-semibold">{queueStatus}</p>
                  <p className="mt-2 text-red-600 font-semibold">
                    Estimated Wait: {countdown} sec
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg bg-black text-white placeholder-gray-400 shadow-md"
              />

              <div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (10 digits)"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-black text-white placeholder-gray-400 shadow-md"
                />
                {phoneError && <p className="text-red-500 text-xs mt-1 text-left">{phoneError}</p>}
              </div>

              <input
                type="email"
                name="email"
                placeholder="Email (optional)"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-black text-white placeholder-gray-400 shadow-md"
              />

              <select
                name="tableFor"
                value={formData.tableFor}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg bg-black text-white shadow-md"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{`Table for ${i + 1}`}</option>
                ))}
              </select>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md"
              >
                JOIN QUEUE
              </button>
            </form>
          )}
        </div>
      </div>

      {customer && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">
              {customer.status === "Assigned" ? "Table Assigned!" : "Queue Status"}
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-lg font-semibold">{customer.name}</p>
                <p className="text-gray-400">{customer.phone}</p>
                <p className="text-gray-400">Party of {customer.partySize || customer.tableFor || 1}</p>
              </div>

              {customer.status === "Assigned" ? (
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400 mb-2">
                    Table {customer.tableNumber} is ready for you!
                  </p>
                  <p className="text-gray-400">
                    Please proceed to your table
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-400 mb-2">
                    Waiting in Queue
                  </p>
                  <p className="text-gray-400 mb-4">
                    Position: #{customer.positionInQueue}
                  </p>
                  <p className="text-gray-400">
                    Estimated wait time: {customer.estimatedWaitTime} minutes
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setCustomer(null);
                  setShowForm(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
              >
                {customer.status === "Assigned" ? "Done" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
