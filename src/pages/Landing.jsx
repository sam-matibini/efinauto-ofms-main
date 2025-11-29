import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Car, Wrench, Package, Plane, DollarSign, Users, BarChart3, 
  Check, ArrowRight, TrendingUp, TrendingDown, Newspaper, 
  CreditCard, Shield, Zap, Globe, Building2, Loader2
} from "lucide-react";
import { motion } from "framer-motion";

const subscriptionPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    interval: "month",
    description: "Perfect for small dealerships",
    features: [
      "Vehicle Inventory Management",
      "Customer Management",
      "Basic Sales Tracking",
      "Up to 50 vehicles",
      "Email Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales"],
    popular: false
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    interval: "month",
    description: "For growing dealerships",
    features: [
      "Everything in Starter",
      "Auto Repair Shop",
      "Parts Inventory",
      "Exports & Freight",
      "Financial Reports",
      "Up to 200 vehicles",
      "Priority Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales", "Repairs", "Parts", "Exports", "Freight", "Reports"],
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 349,
    interval: "month",
    description: "Full-featured solution",
    features: [
      "Everything in Professional",
      "Full Accounting Suite",
      "Payroll & HR",
      "Banking Integration",
      "AI Assistant",
      "Unlimited vehicles",
      "Multi-company support",
      "24/7 Phone Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales", "Repairs", "Parts", "Exports", "Freight", "Reports", "Accounting", "Payroll", "Banking", "FinancialAssistant"],
    popular: false
  }
];

const moduleCategories = [
  {
    category: "Core Operations",
    modules: [
      { id: "Vehicles", name: "Vehicle Management", icon: Car, price: 19 },
      { id: "Sales", name: "Sales & CRM", icon: DollarSign, price: 29 },
      { id: "Customers", name: "Customer Management", icon: Users, price: 15 },
    ]
  },
  {
    category: "Service & Inventory",
    modules: [
      { id: "Repairs", name: "Auto Repair Shop", icon: Wrench, price: 25 },
      { id: "Parts", name: "Parts Inventory", icon: Package, price: 19 },
      { id: "Technicians", name: "Technician Management", icon: Users, price: 15 },
    ]
  },
  {
    category: "Export & Freight",
    modules: [
      { id: "Exports", name: "Export Management", icon: Plane, price: 35 },
      { id: "Freight", name: "Freight & Cargo", icon: Package, price: 29 },
    ]
  },
  {
    category: "Finance & Accounting",
    modules: [
      { id: "Accounting", name: "Full Accounting Suite", icon: DollarSign, price: 49 },
      { id: "Payroll", name: "Payroll & HR", icon: Users, price: 39 },
      { id: "Banking", name: "Banking Integration", icon: Building2, price: 29 },
      { id: "FinancialAssistant", name: "AI Financial Assistant", icon: Zap, price: 25 },
    ]
  }
];

export default function Landing() {
  const [selectedModules, setSelectedModules] = useState([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [financialNews, setFinancialNews] = useState(null);
  const [loadingNews, setLoadingNews] = useState(true);

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  // Fetch financial news and rates
  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoadingNews(true);
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Provide current financial market data as of today. Include:
1. Major currency exchange rates (USD to CAD, EUR, GBP, JPY)
2. Current inflation rates for US and Canada
3. Current interest rates (Bank of Canada rate, US Federal Reserve rate, prime lending rates)
4. 3 brief recent financial/automotive industry news headlines
5. 2 brief market trends relevant to auto dealerships
6. 2-3 recent news items about AI impact on the automotive industry (autonomous vehicles, AI in manufacturing, AI in dealerships, etc.)

Keep each item concise.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              exchange_rates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pair: { type: "string" },
                    rate: { type: "number" },
                    change: { type: "number" }
                  }
                }
              },
              inflation: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    country: { type: "string" },
                    rate: { type: "number" }
                  }
                }
              },
              interest_rates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    rate: { type: "number" },
                    change: { type: "string" }
                  }
                }
              },
              news: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    summary: { type: "string" }
                  }
                }
              },
              ai_automotive_news: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    summary: { type: "string" }
                  }
                }
              },
              trends: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });
        setFinancialNews(response);
      } catch (error) {
        console.error("Failed to fetch financial data:", error);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchFinancialData();
  }, []);

  const handleSubscribe = async (planId) => {
    setIsSubscribing(true);
    try {
      // Redirect to Stripe checkout or handle subscription
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (plan) {
        // For now, save selected modules to user and redirect to dashboard
        if (user) {
          await base44.auth.updateMe({
            subscription_plan: planId,
            accessible_modules: plan.modules,
            subscription_date: new Date().toISOString()
          });
          window.location.href = createPageUrl("Dashboard");
        } else {
          base44.auth.redirectToLogin(createPageUrl("Landing"));
        }
      }
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const calculateModuleTotal = () => {
    return selectedModules.reduce((total, moduleId) => {
      for (const cat of moduleCategories) {
        const mod = cat.modules.find(m => m.id === moduleId);
        if (mod) return total + mod.price;
      }
      return total;
    }, 0);
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-white font-bold text-lg">efinauto.ca</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-gray-300 text-sm hidden md:block">Welcome, {user.full_name}</span>
                <Link to={createPageUrl("Dashboard")}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Dashboard
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white" onClick={() => base44.auth.logout()}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white" onClick={() => base44.auth.redirectToLogin()}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => base44.auth.redirectToLogin()}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-blue-600 text-white mb-4">Automotive Business Management</Badge>
              <div className="mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800" 
                  alt="2025 BMW X6" 
                  className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl border border-slate-700"
                />
                <p className="text-blue-400 mt-3 font-semibold">Featured: 2025 BMW X6</p>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Welcome to <span className="text-blue-400">efinauto.ca</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Your trusted Canadian automotive partner. Complete dealership management, 
                vehicle exports, financing solutions, and AI-powered business tools.
              </p>
              <div className="flex gap-4 justify-center">
                {user ? (
                  <Link to={createPageUrl("Dashboard")}>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      Go to Dashboard
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => base44.auth.redirectToLogin()}>
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                      View Demo
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Financial News & Rates Ticker */}
      <section className="bg-slate-800 border-y border-slate-700 py-4">
        <div className="max-w-7xl mx-auto px-6">
          {loadingNews ? (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading market data...
            </div>
          ) : financialNews ? (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Exchange Rates */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Exchange Rates (USD)
                </h4>
                <div className="flex flex-wrap gap-3">
                  {financialNews.exchange_rates?.slice(0, 4).map((rate, i) => (
                    <div key={i} className="flex items-center gap-1 text-sm">
                      <span className="text-gray-300">{rate.pair}:</span>
                      <span className="text-white font-medium">{rate.rate?.toFixed(4)}</span>
                      {rate.change !== undefined && (
                        <span className={`flex items-center ${rate.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {rate.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inflation Rates */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Inflation Rates
                </h4>
                <div className="flex gap-4">
                  {financialNews.inflation?.map((inf, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-gray-300">{inf.country}:</span>
                      <span className="text-white font-medium ml-1">{inf.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Trends */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Market Trends
                </h4>
                <div className="text-sm text-gray-300 truncate">
                  {financialNews.trends?.[0]}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Financial News Section */}
      {financialNews?.news && (
        <section className="py-12 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-blue-400" />
              Financial & Industry News
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {financialNews.news.map((item, i) => (
                <Card key={i} className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white mb-2">{item.headline}</h3>
                    <p className="text-sm text-gray-400">{item.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Subscription Plans */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
            <p className="text-gray-400">Select a subscription plan that fits your business needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {subscriptionPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full ${plan.popular ? 'border-blue-500 border-2' : 'border-slate-600'} bg-slate-800`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300">
                          <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-500'}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Subscribe Now
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* À La Carte Modules */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Or Build Your Own Package</h2>
            <p className="text-gray-400">Select individual modules to create a custom solution</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {moduleCategories.map((category, catIndex) => (
              <Card key={catIndex} className="bg-slate-800 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.modules.map((module) => (
                    <div 
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedModules.includes(module.id) 
                          ? 'bg-blue-600/20 border border-blue-500' 
                          : 'bg-slate-700 border border-transparent hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedModules.includes(module.id) ? 'bg-blue-600' : 'bg-slate-600'}`}>
                          <module.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-medium">{module.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">${module.price}/mo</span>
                        {selectedModules.includes(module.id) && (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedModules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-slate-700 rounded-xl border border-slate-600"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-gray-400">Selected {selectedModules.length} modules</p>
                  <p className="text-3xl font-bold text-white">
                    ${calculateModuleTotal()}<span className="text-lg text-gray-400">/month</span>
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (user) {
                      base44.auth.updateMe({ 
                        accessible_modules: ["Dashboard", ...selectedModules],
                        subscription_type: "custom"
                      }).then(() => {
                        window.location.href = createPageUrl("Dashboard");
                      });
                    } else {
                      base44.auth.redirectToLogin();
                    }
                  }}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscribe to Selected
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Advertisement / Partners Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Trusted By Industry Leaders</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {["Stripe", "QuickBooks", "Twilio", "Google Maps"].map((partner, i) => (
              <div key={i} className="flex items-center justify-center p-6 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-gray-400 font-semibold">{partner}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure & Compliant</h3>
              <p className="text-gray-400">Bank-level security with full data encryption and compliance</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered</h3>
              <p className="text-gray-400">Smart insights and automation powered by advanced AI</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Global Ready</h3>
              <p className="text-gray-400">Export management and multi-currency support built-in</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400">
          <p>© 2025 efinauto.ca - Canadian Automotive Solutions. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}