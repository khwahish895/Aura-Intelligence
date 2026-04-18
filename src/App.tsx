import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, User, Search, Menu, X, Plus, Minus, Trash2, LayoutDashboard, LogOut, ChevronRight, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { Product, UserProfile, CartItem, Order } from './types';
import { getProductRecommendations, getSearchSuggestions } from './lib/gemini';

// --- Components ---

const Navbar = ({ 
  user, 
  cartCount, 
  onCartToggle, 
  onDashboardToggle, 
  onAuthToggle,
  searchQuery,
  setSearchQuery,
  suggestions
}: any) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-aura-bg/80 backdrop-blur-md border-b border-aura-line">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <h1 className="font-serif italic font-medium text-2xl tracking-tight text-aura-text cursor-pointer" onClick={() => window.location.reload()}>
            Aura Intelligence
          </h1>
          
          <div className="hidden lg:flex items-center gap-8">
            <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">Curated</span>
            <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">Archive</span>
            <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">Vision</span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 relative group">
          <div className="search-bar w-full group-focus-within:border-aura-accent transition-all">
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 opacity-40" />
              <input 
                type="text" 
                placeholder="Search products, styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full"
              />
            </div>
            <span className="opacity-20">/</span>
          </div>
          {suggestions.length > 0 && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-aura-surface rounded-xl shadow-2xl border border-aura-line overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
              {suggestions.map((s: string) => (
                <div 
                  key={s} 
                  className="px-4 py-2 text-sm hover:bg-aura-accent hover:text-black cursor-pointer transition-colors"
                  onClick={() => setSearchQuery(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              <button onClick={onDashboardToggle} className="p-2 hover:bg-white/5 rounded-full relative group transition-colors">
                <LayoutDashboard className="w-5 h-5 opacity-60 group-hover:opacity-100" />
              </button>
              <div className="w-8 h-8 rounded-sm bg-aura-accent overflow-hidden border border-aura-line">
                <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : (
            <button onClick={onAuthToggle} className="micro-label hover:text-aura-accent transition-colors">Sign In</button>
          )}
          
          <button onClick={onCartToggle} className="p-2 hover:bg-white/5 rounded-full relative group transition-colors">
            <ShoppingCart className="w-5 h-5 opacity-60 group-hover:opacity-100" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-aura-accent text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

const ProductCard: React.FC<{ product: Product; onAddToCart: (p: Product) => Promise<void> | void }> = ({ product, onAddToCart }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-sm bg-aura-surface border border-aura-line relative">
        <img 
          src={product.images[0]} 
          alt={product.name} 
          className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="micro-label bg-aura-bg/80 backdrop-blur px-2 py-1 rounded-sm">{product.category}</span>
        </div>
        <button 
          onClick={() => onAddToCart(product)}
          className="absolute bottom-4 right-4 bg-aura-text text-black p-4 rounded-sm opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:bg-aura-accent"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-4 flex justify-between items-start">
        <div>
          <h3 className="font-serif italic text-lg text-aura-text group-hover:text-aura-accent transition-colors">{product.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-current text-aura-accent" />
            <span className="text-[10px] font-bold text-aura-muted uppercase tracking-tighter">{product.rating} Match</span>
          </div>
        </div>
        <span className="font-serif text-lg">${(product.price / 100).toFixed(2)}</span>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const q = query(collection(db, "users"), where("uid", "==", u.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
          // New User
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || "",
            displayName: u.displayName || "",
            role: u.email === 'khwahishsingh2005@gmail.com' ? 'admin' : 'user',
            wishlist: [],
            cart: []
          };
          await addDoc(collection(db, "users"), newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile({ ...snap.docs[0].data(), id: snap.docs[0].id } as any);
        }
      } else {
        setUserProfile(null);
      }
    });
  }, []);

  // Products Listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(p);
      
      // If no products, seed some (Demo mode)
      if (snap.empty && userProfile?.role === 'admin') {
        const demoItems = [
          { name: "Kinetix Watch", category: "Wearables", price: 29900, rating: 4.8, images: ["https://picsum.photos/seed/watch/800/1200"], description: "Time redefined." },
          { name: "Aero Pods Pro", category: "Audio", price: 19900, rating: 4.9, images: ["https://picsum.photos/seed/audio/800/1200"], description: "Sound that breathes." },
          { name: "Orbit Desk", category: "Office", price: 89900, rating: 4.7, images: ["https://picsum.photos/seed/desk/800/1200"], description: "Focus in motion." }
        ];
        demoItems.forEach(item => {
          addDoc(collection(db, "products"), { ...item, tags: [item.category.toLowerCase()], stock: 10, createdAt: new Date() });
        });
      }
    });
  }, [userProfile]);

  // AI Suggestions
  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(async () => {
        const s = await getSearchSuggestions(searchQuery, products.map(p => p.name));
        setSuggestions(s);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      alert("Please sign in to shop.");
      return;
    }
    // Update local and remote
    const newCart = [...(userProfile?.cart || [])];
    const index = newCart.findIndex(i => i.productId === product.id);
    if (index > -1) {
      newCart[index].quantity += 1;
    } else {
      newCart.push({ productId: product.id, quantity: 1 });
    }
    
    if (userProfile?.uid) {
      const q = query(collection(db, "users"), where("uid", "==", userProfile.uid));
      const snap = await getDocs(q);
      await updateDoc(doc(db, "users", snap.docs[0].id), { cart: newCart });
      setUserProfile({ ...userProfile, cart: newCart });
    }
  };

  const totalPrice = (userProfile?.cart || []).reduce((acc, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return acc + (p?.price || 0) * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen">
      <Navbar 
        user={user} 
        cartCount={(userProfile?.cart || []).reduce((a, b) => a + b.quantity, 0)}
        onCartToggle={() => setCartOpen(!cartOpen)}
        onDashboardToggle={() => setDashboardOpen(!dashboardOpen)}
        onAuthToggle={signInWithGoogle}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={suggestions}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-aura-surface -z-10 translate-x-1/2 skew-x-12 opacity-50" />
        <div className="max-w-7xl mx-auto border-b border-aura-line pb-16">
          <span className="smart-label">Adaptive Curation v2.0</span>
          <div className="flex flex-col md:flex-row items-end justify-between gap-12">
            <div className="flex-1">
              <h2 className="font-serif font-light text-7xl md:text-9xl lg:text-[10rem] leading-[0.85] tracking-tight">
                Artificial <br /> Silhouette
              </h2>
            </div>
            <div className="max-w-xs space-y-8">
              <p className="text-sm leading-relaxed text-aura-muted">
                Based on your preference for architectural lines and monochrome palettes. Explore the Aris 2026 Collection.
              </p>
              <button className="cta-button group">
                View Collection <ArrowRight className="inline ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {filteredProducts.map(p => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
          ))}
        </div>
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 bg-nexus-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-aura-surface z-[70] shadow-2xl flex flex-col border-l border-aura-line"
            >
              <div className="p-8 border-b border-aura-line flex items-center justify-between">
                <h3 className="font-serif text-2xl italic">Wardrobe</h3>
                <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {(userProfile?.cart || []).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-aura-muted">
                    <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                    <p className="micro-label">Empty Archive</p>
                  </div>
                ) : (
                  (userProfile?.cart || []).map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="flex gap-6 group">
                        <div className="w-24 h-32 rounded-sm overflow-hidden bg-aura-bg border border-aura-line">
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <h4 className="font-serif italic text-lg">{product.name}</h4>
                            <p className="micro-label lowercase opacity-40">{product.category}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-lg">${(product.price / 100).toFixed(2)}</span>
                            <div className="flex items-center gap-4 bg-aura-bg border border-aura-line px-3 py-1 scale-90">
                              <button className="text-aura-muted hover:text-aura-accent"><Minus className="w-3 h-3"/></button>
                              <span className="text-xs font-bold tabular-nums">{item.quantity}</span>
                              <button className="text-aura-muted hover:text-aura-accent"><Plus className="w-3 h-3"/></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-8 border-t border-aura-line bg-aura-bg">
                <div className="flex justify-between items-end mb-8">
                  <span className="micro-label">Investment</span>
                  <span className="font-serif text-4xl tracking-tighter">${(totalPrice / 100).toFixed(2)}</span>
                </div>
                <button 
                  disabled={(userProfile?.cart || []).length === 0}
                  className="cta-button w-full flex items-center justify-center gap-2 group disabled:opacity-20"
                >
                  Confirm Selection <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dashboard Modal (Simple version for first implementation) */}
      <AnimatePresence>
        {dashboardOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-aura-bg flex flex-col"
          >
            <div className="p-8 border-b border-aura-line flex items-center justify-between">
              <div className="flex items-center gap-6">
                <LayoutDashboard className="w-6 h-6 text-aura-accent" />
                <h3 className="font-serif text-2xl italic tracking-tight">Intelligence Portal</h3>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={logout} className="p-2 hover:bg-red-500/10 text-red-400 rounded-sm flex items-center gap-2 micro-label transition-colors">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
                <button onClick={() => setDashboardOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              <aside className="w-72 border-r border-aura-line p-8 space-y-2 bg-aura-surface/30">
                <button className="w-full text-left px-4 py-3 rounded-sm bg-aura-text text-black micro-label font-bold">Predictive Analytics</button>
                <button className="w-full text-left px-4 py-3 rounded-sm hover:bg-white/5 micro-label">Smart Inventory</button>
                <button className="w-full text-left px-4 py-3 rounded-sm hover:bg-white/5 micro-label">Personalization Eng.</button>
              </aside>
              <main className="flex-1 p-12 overflow-y-auto">
                {userProfile?.role === 'admin' ? (
                  <div className="space-y-12">
                    <div className="section-title">Global Performance Metrics</div>
                    <div className="grid grid-cols-3 gap-8">
                      <div className="p-8 rounded-sm border border-aura-line bg-aura-surface relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-aura-accent/5 -translate-y-6 translate-x-6 rotate-45 group-hover:scale-150 transition-transform" />
                        <p className="micro-label mb-4">Total Revenue</p>
                        <p className="font-serif text-4xl tracking-tighter">$12,450.00</p>
                      </div>
                      <div className="p-8 rounded-sm border border-aura-line bg-aura-surface">
                        <p className="micro-label mb-4">CTR Prediction</p>
                        <p className="font-serif text-4xl tracking-tighter text-aura-accent">12.8%</p>
                      </div>
                      <div className="p-8 rounded-sm border border-aura-line bg-aura-surface">
                        <p className="micro-label mb-4">Active Core</p>
                        <p className="font-serif text-4xl tracking-tighter">128</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="section-title">Identity Archive</div>
                    <div className="h-64 flex flex-col items-center justify-center border border-dashed border-aura-line rounded-lg bg-aura-surface/20">
                      <p className="micro-label italic opacity-20 underline-offset-8 underline">The intelligence is gathering data...</p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-32 border-t border-aura-line">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-2">
            <h1 className="font-serif italic font-medium text-4xl italic tracking-tight mb-8">Aura Intelligence</h1>
            <p className="max-w-sm text-sm text-aura-muted leading-relaxed mb-12">
              Beyond product. We curate digital-physical bridges for the modern pioneer. Part of the Aura Experimental research group.
            </p>
            <div className="flex gap-8">
               <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">Instagram</span>
               <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">X</span>
               <span className="micro-label cursor-pointer hover:text-aura-accent transition-colors">Discord</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="section-title !mb-6 !after:hidden">Manifesto</div>
            <ul className="space-y-4 text-aura-muted text-[13px] uppercase tracking-wider">
              <li className="hover:text-aura-accent cursor-pointer transition-colors">Radical Logic</li>
              <li className="hover:text-aura-accent cursor-pointer transition-colors">Deep Personalization</li>
              <li className="hover:text-aura-accent cursor-pointer transition-colors">Design Ethics</li>
            </ul>
          </div>
          <div className="space-y-6">
             <div className="section-title !mb-6 !after:hidden">Neural Link</div>
             <ul className="space-y-4 text-aura-muted text-[13px] uppercase tracking-wider">
                <li className="hover:text-aura-accent cursor-pointer transition-colors">hq@aura.intelligence</li>
                <li className="hover:text-aura-accent cursor-pointer transition-colors">Terminus B6, Sector 8</li>
             </ul>
          </div>
        </div>
        <div className="mt-32 pt-12 border-t border-aura-line flex justify-between items-center text-aura-muted">
           <span className="micro-label opacity-20">&copy; 2026 Aura Intelligence Systems</span>
           <span className="font-mono text-[10px] opacity-20">SYSTEM STATUS: HARMONIZED</span>
        </div>
      </footer>
    </div>
  );
}
