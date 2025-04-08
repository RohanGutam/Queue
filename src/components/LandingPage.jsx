import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(true);
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if restaurant is open (example: open from 10 AM to 10 PM)
      const hour = now.getHours();
      setIsOpen(hour >= 10 && hour < 22);
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const handleJoinQueue = () => {
    navigate("/queue");
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleAdminLogin = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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
          <button 
            onClick={handleAdminLogin}
            className="text-white hover:text-red-400 font-medium transition-colors"
          >
            Admin Login
          </button>
        </div>
      </nav>
      
      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0 z-0">
          {/* Instead of using an image, use a gradient background */}
          <div 
            className="w-full h-full bg-gradient-to-br from-gray-900 via-red-900 to-black"
          ></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tighter">
            Bite-Buzz
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 max-w-3xl">
            Experience exquisite dining in a charming atmosphere
          </p>
          
          <div className="bg-black bg-opacity-70 p-4 rounded-lg mb-8">
            <p className="text-lg mb-2">
              <span className={isOpen ? "text-green-400" : "text-red-400"}>
                {isOpen ? "OPEN NOW" : "CLOSED"}
              </span> • Hours: 10AM - 10PM
            </p>
            <p className="text-sm text-gray-300">
              Current time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          
          <button
            onClick={handleJoinQueue}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors duration-300 shadow-lg"
          >
            Join The Queue
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 bg-black bg-opacity-90">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-red-500 text-4xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold mb-2">Excellent Cuisine</h3>
              <p className="text-gray-400">Enjoy our award-winning dishes prepared by top chefs using the finest ingredients.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-red-500 text-4xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-2">Smart Queue System</h3>
              <p className="text-gray-400">Join our digital queue to minimize wait times and get real-time updates on your table status.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-red-500 text-4xl mb-4">🌆</div>
              <h3 className="text-xl font-semibold mb-2">Perfect Ambiance</h3>
              <p className="text-gray-400">Immerse yourself in our carefully crafted atmosphere perfect for any occasion.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Preview Section */}
      <div className="py-16 px-4 bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Our Specialties</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-black bg-opacity-60 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4 text-red-400">Chef's Recommendations</h3>
              <ul className="space-y-4">
                <li className="flex justify-between">
                  <span className="font-medium">Signature Steak</span>
                  <span className="text-gray-400">$32</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">Seafood Paella</span>
                  <span className="text-gray-400">$38</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">Truffle Risotto</span>
                  <span className="text-gray-400">$28</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-black bg-opacity-60 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4 text-red-400">Signature Drinks</h3>
              <ul className="space-y-4">
                <li className="flex justify-between">
                  <span className="font-medium">Classic Martini</span>
                  <span className="text-gray-400">$14</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">Aged Whiskey Selection</span>
                  <span className="text-gray-400">$18</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">House Special Sangria</span>
                  <span className="text-gray-400">$12</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={handleJoinQueue}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg"
            >
              Reserve A Table Now
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Bite-Buzz</h2>
          <p className="text-gray-400 mb-6">123 Dining Street, Foodville, FD 12345</p>
          
          <div className="flex justify-center space-x-4 mb-6">
            <a href="#" className="text-white hover:text-red-400">
              <span className="sr-only">Facebook</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-white hover:text-red-400">
              <span className="sr-only">Instagram</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-white hover:text-red-400">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
          
          <p className="text-gray-500 text-sm">© 2025 Bite-Buzz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}