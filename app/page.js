"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hoeozdkielljdggwpxml.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZW96ZGtpZWxsamRnZ3dweG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNDAzMjAsImV4cCI6MjA2MzgxNjMyMH0.fgaX4SckrztFI8J3TLVK1vtbqSvtkbeYgcunTzTJvjQ";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [adminForm, setAdminForm] = useState({ name: "", price: "", image: null });
  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminLogin, setAdminLogin] = useState({ email: '', password: '' });
  const [adminSignup, setAdminSignup] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [adminMode, setAdminMode] = useState('login'); // 'login' or 'signup'

  // Book modal state
  const [showBook, setShowBook] = useState(false);
  const [bookProduct, setBookProduct] = useState(null);
  const [bookForm, setBookForm] = useState({ name: '', email: '', phone: '', address: '' });

  // My Orders Drawer state
  const [showOrders, setShowOrders] = useState(false);
  const [ordersList, setOrdersList] = useState([]);

  // Banner slider state
  const bannerImages = [
    "all.jpeg",
    "all1.jpg",
    "all2.jpg",
    "apples.jpg" // new image added
  ];
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimeout = useRef();

  useEffect(() => {
    bannerTimeout.current && clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => {
      setBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 3000);
    return () => clearTimeout(bannerTimeout.current);
  }, [bannerIndex]);

  // Fetch products and add demo products if empty
  useEffect(() => {
    const addDemoProducts = async () => {
      const { data, error } = await supabase.from("products").select("*");

      if (error) {
        alert("Error fetching products: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        const demoProducts = [
          {
            name: "Fresh Apples",
            price: 332,
            image_url: "/apples.jpg",
          },
          {
            name: "Bananas",
            price: 107,
            image_url: "/Banana.jpg",
          },
          {
            name: "Organic Carrots",
            price: 208,
            image_url: "/carrots.jpg",
          },
          {
            name: "Strawberries",
            price: 165,
            image_url: "/strawberries.jpg",
          },
          {
            name: "Pineapples",
            price: 120,
            image_url: "/pineapple.jpg",
          },
          {
            name: "Oranges",
            price: 90,
            image_url: "/orange.jpg",
          },
          {
            name: "Watermelons",
            price: 60,
            image_url: "/watermelon.jpg",
          },
          {
            name: "Cherries",
            price: 250,
            image_url: "/cherry.jpg",
          },
        ];
        
        const { error: insertError } = await supabase.from("products").insert(demoProducts);
        if (insertError) {
          alert("Error inserting demo products: " + insertError.message);
          return;
        }
      }
      fetchProducts();
    };

    addDemoProducts();

    supabase.auth.getUser().then((res) => setUser(res.data?.user ?? null));
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch all products from DB
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      alert("Error fetching products: " + error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }
  };

  // Add product to cart
  const addToCart = (p) => {
    setCart((prev) => [...prev, p]);
  };

  // Login with OTP
  const handleLogin = async () => {
    if (!email) return alert("Please enter an email");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for the login link");
  };

  // Upload new product by admin
  const uploadProduct = async () => {
    if (!adminForm.image || !adminForm.name || !adminForm.price) {
      return alert("Fill all admin product fields and choose an image");
    }

    // Upload image to Supabase storage (bucket: products)
    const { data, error } = await supabase.storage
      .from("products")
      .upload(`${Date.now()}_${adminForm.image.name}`, adminForm.image);

    if (error) return alert("Upload failed: " + error.message);

    const image_url = supabase.storage.from("products").getPublicUrl(data.path).data.publicUrl;

    // Insert new product with image url
    const { error: insertError } = await supabase.from("products").insert({
      name: adminForm.name,
      price: Number(adminForm.price),
      image_url,
    });

    if (insertError) return alert("Insert failed: " + insertError.message);

    fetchProducts();
    setAdminForm({ name: "", price: "", image: null });
    alert("Product added");
  };

  // Place order with cart items
  const placeOrder = async () => {
    if (cart.length === 0) return alert("Your cart is empty");
    const total = cart.reduce((sum, p) => sum + (p.price || 0), 0);
    let orderUserId = null;
    if (isAdmin) orderUserId = 'admin';
    else if (user) orderUserId = user.id;
    // Store order with user id (null for guest), products (JSON), total
    const { error } = await supabase.from("orders").insert({
      user_id: orderUserId,
      products: cart,
      total,
    });
    if (error) return alert("Failed to place order: " + error.message);
    setCart([]);
    alert("Order placed!");
  };

  // View orders for logged-in user or admin, no login prompt
  const viewOrders = async () => {
    let query = supabase.from("orders").select("*");
    if (isAdmin) {
      query = query.eq("user_id", "admin");
    } else if (user) {
      query = query.eq("user_id", user.id);
    } else {
      // If not logged in, show empty
      setOrdersList([]);
      setShowOrders(true);
      return;
    }
    const { data, error } = await query;
    if (error) {
      alert("Error fetching orders: " + error.message);
      setOrdersList([]);
    } else {
      setOrdersList(data || []);
    }
    setShowOrders(true);
  };

  // Filter products by search term
  const filteredProducts = products.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Dummy admin auth for demo (replace with real backend in production)
  const [adminUsers, setAdminUsers] = useState(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminUsers');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    }
  }, [adminUsers]);

  const handleAdminLogin = () => {
    // Check against local state (for demo)
    const found = adminUsers.find(u => u.email === adminLogin.email && u.password === adminLogin.password);
    if (
      found ||
      (adminLogin.email === 'admin@example.com' && adminLogin.password === 'admin')
    ) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminLogin({ email: '', password: '' });
      setCart([]); // Clear cart
      setShowCart(false); // Close cart modal if open
      setSearch(""); // Reset search
      fetchProducts(); // Refresh products
      // Remove redirect to role selection after admin login
    } else {
      alert('Invalid admin credentials');
    }
  };

  const handleAdminSignup = () => {
    if (!adminSignup.name || !adminSignup.email || !adminSignup.password || !adminSignup.confirmPassword) {
      alert('Fill all fields');
      return;
    }
    if (adminSignup.password !== adminSignup.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Save new admin user in local state and localStorage
    setAdminUsers(prev => [...prev, { email: adminSignup.email, password: adminSignup.password }]);
    alert('Admin registered! Now login.');
    setAdminMode('login');
    setAdminSignup({ name: '', email: '', password: '', confirmPassword: '' });
    setCart([]); // Clear cart
    setShowCart(false); // Close cart modal if open
    setSearch(""); // Reset search
    fetchProducts(); // Refresh products
  };

  // Book product handler
  const handleBook = (product) => {
    setBookProduct(product);
    setShowBook(true);
    setShowCart(true); // Open cart drawer above book drawer
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    alert(`Booked ${bookProduct?.name} successfully!`);
    setShowBook(false);
    setBookForm({ name: '', email: '', phone: '', address: '' });
    setBookProduct(null);
  };

  // Helper to normalize image URLs for local and remote images
  function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (!url.startsWith('/')) return '/' + url;
    return url;
  }

  // New: Show role selection modal at the beginning
  const [showRoleModal, setShowRoleModal] = useState(true);
  const [role, setRole] = useState(""); // "admin" or "user"

  // New: Show user login/signup modal
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [userLogin, setUserLogin] = useState({ email: '', password: '' });
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userMode, setUserMode] = useState('login'); // 'login' or 'signup'
  const [userSignup, setUserSignup] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [userAccounts, setUserAccounts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userAccounts');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
    }
  }, [userAccounts]);

  // Hamburger menu state
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Hide all other UI until role is selected and login/signup is complete
  if (showRoleModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(255, 246, 242, 0.9)' }}>
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-xs w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 text-[#ff5a36]">Welcome! Who are you?</h2>
          <button
            className="bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-3 rounded font-semibold w-full mb-4 text-lg"
            onClick={() => { setRole("user"); setShowRoleModal(false); setShowUserLogin(true); }}
          >
            I am a User
          </button>
          <button
            className="bg-[#36a2ff] hover:bg-[#369aff] text-white px-6 py-3 rounded font-semibold w-full text-lg"
            onClick={() => { setRole("admin"); setShowRoleModal(false); setShowAdminLogin(true); }}
          >
            I am an Admin
          </button>
        </div>
      </div>
    );
  }

  // User login/signup modal
  if (showUserLogin && !isUserLoggedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(255, 246, 242, 0.9)' }}>
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 max-w-sm w-full relative mx-2">
          <button className="absolute top-2 right-2 text-2xl" onClick={() => { setShowUserLogin(false); setShowRoleModal(true); }}>&times;</button>
          <h2 className="text-2xl font-bold mb-4 text-[#ff5a36]">{userMode === 'login' ? 'User Login' : 'User Sign Up'}</h2>
          {userMode === 'login' ? (
            <>
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={userLogin.email} onChange={e => setUserLogin({ ...userLogin, email: e.target.value })} type="email" />
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={userLogin.password} onChange={e => setUserLogin({ ...userLogin, password: e.target.value })} type="password" />
              <button className="mt-2 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={() => {
                if (!userLogin.email || !userLogin.password) {
                  alert('Please enter email and password');
                  return;
                }
                const found = userAccounts.find(u => u.email === userLogin.email && u.password === userLogin.password);
                if (found) {
                  setIsUserLoggedIn(true);
                  setShowUserLogin(false);
                } else {
                  alert('Account not found. Please sign up.');
                  setUserMode('signup');
                }
              }}>Login</button>
              <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setUserMode('signup')}>Don't have an account? Sign Up</p>
            </>
          ) : (
            <>
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Full Name" value={userSignup.name} onChange={e => setUserSignup({ ...userSignup, name: e.target.value })} type="text" />
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={userSignup.email} onChange={e => setUserSignup({ ...userSignup, email: e.target.value })} type="email" />
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={userSignup.password} onChange={e => setUserSignup({ ...userSignup, password: e.target.value })} type="password" />
              <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Confirm Password" value={userSignup.confirmPassword} onChange={e => setUserSignup({ ...userSignup, confirmPassword: e.target.value })} type="password" />
              <button className="mt-2 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={() => {
                if (!userSignup.name || !userSignup.email || !userSignup.password || !userSignup.confirmPassword) {
                  alert('Fill all fields');
                  return;
                }
                if (userSignup.password !== userSignup.confirmPassword) {
                  alert('Passwords do not match');
                  return;
                }
                if (userAccounts.find(u => u.email === userSignup.email)) {
                  alert('Account already exists. Please login.');
                  setUserMode('login');
                  return;
                }
                setUserAccounts(prev => [...prev, { name: userSignup.name, email: userSignup.email, password: userSignup.password }]);
                alert('User registered! Now login.');
                setUserMode('login');
                setUserSignup({ name: '', email: '', password: '', confirmPassword: '' });
              }}>Sign Up</button>
              <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setUserMode('login')}>Back to Login</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafbfc] font-sans">
      {/* Header */}
      <header className="bg-white flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 shadow-md sticky top-0 z-10 w-full">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span className="text-2xl font-bold tracking-tight text-[#ff5a36]">🍎 Fruits Shop</span>
        </div>
        {/* Hamburger icon for mobile */}
        <button
          className="sm:hidden absolute right-4 top-4 text-3xl text-[#ff5a36] focus:outline-none"
          onClick={() => setShowMobileNav(true)}
          aria-label="Open navigation menu"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="#ff5a36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <nav className="hidden sm:flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-[#ff5a36] font-semibold w-full sm:w-auto">
          <a className="hover:underline" href="#">
            Home
          </a>
          <a className="hover:underline" href="#shop-now">
            Shop
          </a>
          <button className="hover:underline" onClick={() => setShowCart(true)}>
            Bag({cart.length})
          </button>
          <button className="hover:underline text-[#ff5a36]" onClick={viewOrders}>
            My Orders
          </button>
          {/* Show logout for admin or user, otherwise show Admin button */}
          {isAdmin ? (
            <button
              className="hover:underline text-[#ff5a36]"
              onClick={() => {
                setIsAdmin(false);
                setCart([]);
                setShowCart(false);
                setSearch("");
                fetchProducts();
                setRole("");
                setShowRoleModal(true); // Show role selection modal after admin logout
              }}
            >
              Logout (Admin)
            </button>
          ) : isUserLoggedIn ? (
            <button
              className="hover:underline text-[#ff5a36]"
              onClick={() => {
                setIsUserLoggedIn(false);
                setCart([]);
                setShowCart(false);
                setSearch("");
                setUserLogin({ email: '', password: '' });
                setUserSignup({ name: '', email: '', password: '', confirmPassword: '' });
                setRole("");
                setShowRoleModal(true);
              }}
            >
              Logout (User)
            </button>
          ) : (
            <button className="hover:underline" onClick={() => setShowAdminLogin(true)}>Admin</button>
          )}
        </nav>
      </header>

      {/* Mobile Nav Drawer */}
      {showMobileNav && (
        <div className="fixed inset-0 z-50 bg-[rgba(255,246,242,0.95)] flex">
          <div className="w-64 max-w-full bg-white h-full shadow-2xl flex flex-col p-6 relative animate-slideInLeft">
            <button
              className="absolute top-4 right-4 text-2xl text-[#ff5a36]"
              onClick={() => setShowMobileNav(false)}
              aria-label="Close navigation menu"
            >
              &times;
            </button>
            <nav className="flex flex-col gap-6 mt-10 text-lg font-semibold text-[#ff5a36]">
              <a className="hover:underline" href="#" onClick={() => setShowMobileNav(false)}>
                Home
              </a>
              <a className="hover:underline" href="#shop-now" onClick={() => setShowMobileNav(false)}>
                Shop
              </a>
              <button className="hover:underline text-left" onClick={() => { setShowCart(true); setShowMobileNav(false); }}>
                Bag({cart.length})
              </button>
              <button className="hover:underline text-left" onClick={() => { viewOrders(); setShowMobileNav(false); }}>
                My Orders
              </button>
              {isAdmin ? (
                <button
                  className="hover:underline text-left"
                  onClick={() => {
                    setIsAdmin(false);
                    setCart([]);
                    setShowCart(false);
                    setSearch("");
                    fetchProducts();
                    setRole("");
                    setShowRoleModal(true);
                    setShowMobileNav(false);
                  }}
                >
                  Logout (Admin)
                </button>
              ) : isUserLoggedIn ? (
                <button
                  className="hover:underline text-left"
                  onClick={() => {
                    setIsUserLoggedIn(false);
                    setCart([]);
                    setShowCart(false);
                    setSearch("");
                    setUserLogin({ email: '', password: '' });
                    setUserSignup({ name: '', email: '', password: '', confirmPassword: '' });
                    setRole("");
                    setShowRoleModal(true);
                    setShowMobileNav(false);
                  }}
                >
                  Logout (User)
                </button>
              ) : (
                <button className="hover:underline text-left" onClick={() => { setShowAdminLogin(true); setShowMobileNav(false); }}>Admin</button>
              )}
            </nav>
          </div>
          {/* Overlay click closes drawer */}
          <div className="flex-1" onClick={() => setShowMobileNav(false)} />
          <style>{`
            @keyframes slideInLeft {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
            .animate-slideInLeft {
              animation: slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1);
            }
          `}</style>
        </div>
      )}

      {/* Banner - sliding images with right-to-left slide effect (all images visible at once, seamless loop) */}
      <div className="max-w-7xl mx-auto mt-4 sm:mt-8 relative h-48 sm:h-[28rem] px-2 sm:px-4 overflow-hidden rounded-2xl">
        <div
          className="absolute top-0 left-0 flex h-48 sm:h-[28rem] w-full"
          style={{
            width: '200%', // Double the width for seamless loop
            animation: 'marquee 12s linear infinite',
          }}
        >
          {/* Duplicate images for seamless loop */}
          {[...bannerImages, ...bannerImages].map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="fruits banner"
              className="h-48 sm:h-[28rem] object-cover rounded-2xl flex-shrink-0"
              style={{ width: `${100 / bannerImages.length}%` }}
            />
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* Shop Now Title */}
      <h1 id="shop-now" className="text-3xl sm:text-5xl font-bold text-center text-[#ff5a36] mt-8 sm:mt-12 mb-4 sm:mb-6">Shop Now</h1>

      {/* Admin Panel (Add Product) - now shown below Shop Now if admin */}
      {isAdmin && (
        <div className="max-w-2xl mx-auto mb-8 sm:mb-10 px-2 sm:px-0">
          <section className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#ff5a36]">🔐 Admin - Add Product</h2>
            <div className="flex flex-col gap-2">
              <input className="rounded px-2 py-1 border-2 border-transparent text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Name" value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} />
              <input className="rounded px-2 py-1 border-2 border-transparent text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Price" type="number" value={adminForm.price} onChange={e => setAdminForm({ ...adminForm, price: e.target.value })} />
              <input className="rounded px-2 py-1 border-2 border-transparent text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" type="file" accept="image/*" onChange={e => setAdminForm({ ...adminForm, image: e.target.files?.[0] ?? null })} />
              <button className="bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-4 py-2 rounded font-semibold mt-2" onClick={uploadProduct}>Upload</button>
              <button className="mt-2 text-[#ff5a36] underline" onClick={() => {
                setIsAdmin(false);
                setCart([]); // Clear cart
                setShowCart(false); // Close cart modal if open
                setSearch(""); // Reset search
                fetchProducts(); // Refresh products
                setRole("");
                setShowRoleModal(true); // Show role selection modal after admin logout
              }}>Logout</button>
            </div>
          </section>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex justify-center mb-4 sm:mb-6 px-2">
        <div className="flex items-center bg-white rounded-full shadow px-2 sm:px-4 py-2 w-full max-w-xl">
          <input
            className="flex-1 outline-none px-2 sm:px-3 py-2 rounded-full text-base sm:text-lg"
            placeholder="Search fruits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8 px-2 sm:px-4">
        {filteredProducts.map((p, idx) => (
          <div
            key={p.id || idx}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition p-4 sm:p-6 flex flex-col items-center border-2 border-transparent hover:border-[#ff5a36]"
          >
            <img src={getImageUrl(p.image_url)} alt={p.name} className="w-full h-32 sm:h-40 object-cover rounded-xl mb-3 sm:mb-4" />
            <h4 className="font-bold text-lg sm:text-xl text-[#ff5a36] mb-1 text-center">{p.name}</h4>
            <p className="text-[#ff5a36] font-bold text-base sm:text-lg mb-2 sm:mb-4 text-center">₹{p.price}</p>
            <div className="flex gap-2 w-full">
              <button
                className="bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-3 sm:px-4 py-2 rounded font-semibold flex-1"
                onClick={() => addToCart(p)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Responsive adjustments for drawers and modals */}
      {/* Cart Drawer - top right, above Book drawer */}
      {showCart && (
        <div
          className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 w-full max-w-xs sm:w-80 bg-white shadow-2xl rounded-xl flex flex-col border border-[#ff5a36]"
          style={{ minHeight: '120px', maxHeight: '80vh' }}
        >
          <button
            className="absolute top-2 right-2 text-2xl"
            onClick={() => setShowCart(false)}
            aria-label="Close cart"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-2 text-[#ff5a36] mt-4 ml-6">🛒 Your Cart</h2>
          <div className="flex-1 overflow-y-auto px-6">
            {cart.length === 0 ? (
              <div className="text-gray-500 text-center py-4">Your cart is empty.</div>
            ) : (
              <ul className="space-y-2">
                {cart.map((item, idx) => (
                  <li key={`${item.id ?? idx}-${idx}`} className="flex items-center justify-between border-b pb-1">
                    <div className="flex items-center gap-2">
                      <img src={getImageUrl(item.image_url)} className="w-10 h-10 rounded object-cover" alt={item.name} />
                      <div>
                        <p className="font-semibold text-[#ff5a36] text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">₹{item.price}</p>
                        {/* Show more details if available */}
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                        )}
                        {item.quantity && (
                          <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-6 pb-4 pt-2 border-t mt-auto">
            <div className="flex justify-between items-center font-bold text-base text-[#ff5a36] mb-2">
              <span>Total:</span>
              <span>₹{cart.reduce((sum, item) => sum + item.price, 0)}</span>
            </div>
            <button
              className="bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-4 py-2 rounded font-semibold w-full text-base"
              onClick={() => {
                placeOrder();
                setShowCart(false);
              }}
            >
              Checkout
            </button>
          </div>
        </div>
      )}
      {/* Orders Drawer - top right, above Book drawer, like Cart */}
      {showOrders && (
        <div
          className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 w-full max-w-xs sm:w-80 bg-white shadow-2xl rounded-xl flex flex-col border border-[#ff5a36]"
          style={{ minHeight: '120px', maxHeight: '80vh' }}
        >
          <button
            className="absolute top-2 right-2 text-2xl"
            onClick={() => setShowOrders(false)}
            aria-label="Close orders"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-2 text-[#ff5a36] mt-4 ml-6">📦 My Orders</h2>
          <div className="flex-1 overflow-y-auto px-6">
            {ordersList.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No orders found.</div>
            ) : (
              <ul className="space-y-2">
                {ordersList.map((order, idx) => (
                  <li key={order.id || idx} className="border-b pb-2">
                    <div className="font-semibold text-[#ff5a36]">Order #{order.id}</div>
                    <div className="text-xs text-gray-500 mb-1">Total: ₹{order.total}</div>
                    <ul className="ml-2 text-sm">
                      {order.products && order.products.map((prod, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <img src={getImageUrl(prod.image_url)} className="w-8 h-8 rounded object-cover" alt={prod.name} />
                          <span>{prod.name}</span>
                          <span className="text-gray-400">₹{prod.price}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* Book Modal/Drawer */}
      {showBook && bookProduct && (
        <div
          className={`fixed inset-y-0 right-0 z-40 h-full w-full max-w-md bg-white shadow-xl flex flex-col transform transition-transform duration-300 ${showBook ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ willChange: 'transform' }}
        >
          <button
            className="absolute top-4 right-4 text-2xl"
            onClick={() => setShowBook(false)}
            aria-label="Close book modal"
          >
            &times;
          </button>
          <button
            className="absolute top-4 left-4 p-2"
            onClick={() => setShowBook(false)}
            aria-label="Back to main page"
          >
            <img
              src="/back.svg"
              alt="Back"
              className="w-6 h-6"
              style={{ transform: 'scaleX(-1)', filter: 'invert(41%) sepia(99%) saturate(749%) hue-rotate(349deg) brightness(101%) contrast(101%)' }}
            />
          </button>
          <h2 className="text-2xl font-bold mb-4 text-[#36a2ff] mt-8 ml-8">Book: {bookProduct.name}</h2>
          <form className="flex-1 overflow-y-auto px-8 flex flex-col gap-4" onSubmit={handleBookSubmit}>
            <input className="rounded px-3 py-2 border" placeholder="Full Name" value={bookForm.name} onChange={e => setBookForm({ ...bookForm, name: e.target.value })} required />
            <input className="rounded px-3 py-2 border" placeholder="Email" type="email" value={bookForm.email} onChange={e => setBookForm({ ...bookForm, email: e.target.value })} required />
            <input className="rounded px-3 py-2 border" placeholder="Phone" type="tel" value={bookForm.phone} onChange={e => setBookForm({ ...bookForm, phone: e.target.value })} required />
            <textarea className="rounded px-3 py-2 border" placeholder="Address" value={bookForm.address} onChange={e => setBookForm({ ...bookForm, address: e.target.value })} required />
            <button type="submit" className="bg-[#36a2ff] hover:bg-[#369aff] text-white px-6 py-3 rounded font-semibold w-full text-lg mt-4">Book Now</button>
          </form>
        </div>
      )}
      {/* User/Admin Login/Signup Modals: add px-2 for mobile */}
      {showUserLogin && !isUserLoggedIn && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(255, 246, 242, 0.9)' }}>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 max-w-sm w-full relative mx-2">
            <button className="absolute top-2 right-2 text-2xl" onClick={() => { setShowUserLogin(false); setShowRoleModal(true); }}>&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-[#ff5a36]">{userMode === 'login' ? 'User Login' : 'User Sign Up'}</h2>
            {userMode === 'login' ? (
              <>
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={userLogin.email} onChange={e => setUserLogin({ ...userLogin, email: e.target.value })} type="email" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={userLogin.password} onChange={e => setUserLogin({ ...userLogin, password: e.target.value })} type="password" />
                <button className="mt-2 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={() => {
                  if (!userLogin.email || !userLogin.password) {
                    alert('Please enter email and password');
                    return;
                  }
                  const found = userAccounts.find(u => u.email === userLogin.email && u.password === userLogin.password);
                  if (found) {
                    setIsUserLoggedIn(true);
                    setShowUserLogin(false);
                  } else {
                    alert('Account not found. Please sign up.');
                    setUserMode('signup');
                  }
                }}>Login</button>
                <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setUserMode('signup')}>Don't have an account? Sign Up</p>
              </>
            ) : (
              <>
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Full Name" value={userSignup.name} onChange={e => setUserSignup({ ...userSignup, name: e.target.value })} type="text" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={userSignup.email} onChange={e => setUserSignup({ ...userSignup, email: e.target.value })} type="email" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={userSignup.password} onChange={e => setUserSignup({ ...userSignup, password: e.target.value })} type="password" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Confirm Password" value={userSignup.confirmPassword} onChange={e => setUserSignup({ ...userSignup, confirmPassword: e.target.value })} type="password" />
                <button className="mt-2 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={() => {
                  if (!userSignup.name || !userSignup.email || !userSignup.password || !userSignup.confirmPassword) {
                    alert('Fill all fields');
                    return;
                  }
                  if (userSignup.password !== userSignup.confirmPassword) {
                    alert('Passwords do not match');
                    return;
                  }
                  if (userAccounts.find(u => u.email === userSignup.email)) {
                    alert('Account already exists. Please login.');
                    setUserMode('login');
                    return;
                  }
                  setUserAccounts(prev => [...prev, { name: userSignup.name, email: userSignup.email, password: userSignup.password }]);
                  alert('User registered! Now login.');
                  setUserMode('login');
                  setUserSignup({ name: '', email: '', password: '', confirmPassword: '' });
                }}>Sign Up</button>
                <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setUserMode('login')}>Back to Login</p>
              </>
            )}
          </div>
        </div>
      )}
      {showAdminLogin && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(255, 246, 242, 0.9)' }}>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 max-w-sm w-full relative mx-2">
            <button className="absolute top-2 right-2 text-2xl" onClick={() => setShowAdminLogin(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-[#ff5a36]" style={{ color: '#ff5a36' }}>{adminMode === 'login' ? 'Admin Login' : 'Admin Sign Up'}</h2>
            {adminMode === 'login' ? (
              <>
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={adminLogin.email} onChange={e => setAdminLogin({ ...adminLogin, email: e.target.value })} type="email" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={adminLogin.password} onChange={e => setAdminLogin({ ...adminLogin, password: e.target.value })} type="password" />
                <button className="mt-4 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={handleAdminLogin}>Login</button>
                <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setAdminMode('signup')}>Don't have an account? Sign Up</p>
              </>
            ) : (
              <>
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Full Name" value={adminSignup.name} onChange={e => setAdminSignup({ ...adminSignup, name: e.target.value })} type="text" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Email" value={adminSignup.email} onChange={e => setAdminSignup({ ...adminSignup, email: e.target.value })} type="email" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Password" value={adminSignup.password} onChange={e => setAdminSignup({ ...adminSignup, password: e.target.value })} type="password" />
                <input className="w-full px-3 py-2 border-2 border-transparent rounded mb-4 text-[#ff5a36] placeholder:text-gray-400 bg-white focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36] outline-none" placeholder="Confirm Password" value={adminSignup.confirmPassword} onChange={e => setAdminSignup({ ...adminSignup, confirmPassword: e.target.value })} type="password" />
                <button className="mt-2 bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-2 rounded font-semibold w-full" onClick={handleAdminSignup}>Sign Up</button>
                <p className="mt-4 text-center text-[#ff5a36] cursor-pointer underline" onClick={() => setAdminMode('login')}>Back to Login</p>
              </>
            )}
          </div>
        </div>
      )}
      {/* Role selection modal: add px-2 for mobile */}
      {showRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(255, 246, 242, 0.9)' }}>
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-xs w-full flex flex-col items-center mx-2">
            <h2 className="text-2xl font-bold mb-6 text-[#ff5a36]">Welcome! Who are you?</h2>
            <button
              className="bg-[#ff5a36] hover:bg-[#ff7a36] text-white px-6 py-3 rounded font-semibold w-full mb-4 text-lg"
              onClick={() => { setRole("user"); setShowRoleModal(false); setShowUserLogin(true); }}
            >
              I am a User
            </button>
            <button
              className="bg-[#36a2ff] hover:bg-[#369aff] text-white px-6 py-3 rounded font-semibold w-full text-lg"
              onClick={() => { setRole("admin"); setShowRoleModal(false); setShowAdminLogin(true); }}
            >
              I am an Admin
            </button>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="bg-white text-[#ff5a36] text-center py-4 mt-8 font-semibold text-base sm:text-lg">
        <span>© {new Date().getFullYear()} Fruits Shop</span>
      </footer>
    </main>
  );
}
