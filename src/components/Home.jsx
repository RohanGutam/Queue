import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to Bite-Buzz</h1>
            <p className="text-xl text-gray-400">Join our queue for a table</p>
          </div>

          <div className="flex justify-center mb-8">
            <button
              onClick={handleAdminLogin}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 