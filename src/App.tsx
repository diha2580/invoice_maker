/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  Mail, 
  Phone, 
  Globe, 
  Facebook, 
  MessageSquare,
  Building2,
  Calendar,
  Hash,
  User,
  MapPin,
  CheckCircle2,
  ArrowLeftRight,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore - html2pdf.js doesn't have standard types
import html2pdf from 'html2pdf.js';

interface InvoiceItem {
  id: string;
  description: string;
  price: number;
  qty: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface InvoiceData {
  invoiceNumber: string;
  serialNumber: string;
  date: string;
  dueDate: string;
  companyName: string;
  companySlogan: string;
  companyAddress: string;
  companyPhone: string;
  companyWhatsapp: string;
  companyEmail: string;
  companyFacebook: string;
  companyWebsite: string;
  companyLogo?: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: InvoiceItem[];
  isPaid: boolean;
  notes: string;
}

const DEFAULT_ITEM: InvoiceItem = {
  id: '1',
  description: 'Gigabyte Vision RTX 3060 Ti 8 GB No Box',
  price: 31500,
  qty: 1
};

const INITIAL_DATA: InvoiceData = {
  invoiceNumber: 'INV-2024-001',
  serialNumber: '1049127',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  companyName: 'Infinity Tech Zone',
  companySlogan: 'Honesty Is In Our DNA',
  companyAddress: '35 No. Hormohon Shil Street, Near Khan Mohammad Mosque, Azimpur, Dhaka',
  companyPhone: '+880 1700-000000',
  companyWhatsapp: '+880 1328-842433',
  companyEmail: 'infinitytechzone0@gmail.com',
  companyFacebook: 'Infinity Tech zone',
  companyWebsite: 'www.infinitytechzone.com',
  companyLogo: `data:image/svg+xml;base64,${btoa(`
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="98" fill="black"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="#C5A059" stroke-width="2.5"/>
  <circle cx="100" cy="100" r="86" fill="none" stroke="#C5A059" stroke-width="1.5"/>
  <text x="50%" y="47%" text-anchor="middle" fill="white" font-family="Georgia, serif" font-weight="900" font-size="65" font-style="italic">ITZ</text>
  <text x="50%" y="68%" text-anchor="middle" fill="#C5A059" font-family="Arial, sans-serif" font-weight="bold" font-size="9" letter-spacing="3">INFINITY TECH ZONE</text>
  <path id="curve" d="M 30 110 A 70 70 0 0 0 170 110" fill="transparent" />
  <text fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="8" letter-spacing="2">
    <textPath href="#curve" startOffset="50%" text-anchor="middle" side="right" method="align" spacing="auto">HONESTY IS IN OUR DNA</textPath>
  </text>
</svg>
`)}`,
  customerName: 'Nawshad',
  customerAddress: 'Mohammadpur',
  customerPhone: '01340033469',
  items: [DEFAULT_ITEM],
  isPaid: true,
  notes: '7 Days replacement guarantee 45 days service warranty; No coverage for physical/burn/liquid damage or user-caused issues. Invoice is required for any warranty claim. Warranty will be void if any unauthorized repair is done.'
};

export default function App() {
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'customers'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', phone: '' });
  const [errors, setErrors] = useState<{ invoiceNumber?: string }>({});
  const invoiceRef = useRef<HTMLDivElement>(null);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Persistence Key
  const STORAGE_KEY = 'swift_invoice_business_data';
  const CUSTOMERS_KEY = 'swift_invoice_customers';

  // Load persisted business data on mount
  useEffect(() => {
    const loadData = async () => {
      // Priority 1: Supabase
      if (supabase) {
        try {
          const { data: cloudData, error } = await supabase
            .from('business_settings')
            .select('*')
            .single();

          if (cloudData && !error) {
            // Map from snake_case (DB) back to CamelCase (UI)
            const mappedData = {
              companyName: cloudData.company_name,
              companySlogan: cloudData.company_slogan,
              companyAddress: cloudData.company_address,
              companyPhone: cloudData.company_phone,
              companyWhatsapp: cloudData.company_whatsapp,
              companyEmail: cloudData.company_email,
              companyFacebook: cloudData.company_facebook,
              companyWebsite: cloudData.company_website,
              companyLogo: cloudData.company_logo,
            };
            
            setData(prev => ({ ...prev, ...mappedData }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedData));
            return;
          }

          if (error) {
            const errorMsg = error.message.toLowerCase();
            const isMissingColumn = errorMsg.includes('column') && errorMsg.includes('not found');
            const isMissingTable = errorMsg.includes('relation') && errorMsg.includes('does not exist');
            
            if (isMissingTable || isMissingColumn) {
              console.warn('⚠️ Supabase sync pending: Local data will be used until SQL setup is complete. Error: ' + error.message);
            }
          }
        } catch (e) {
          console.warn('Supabase fetch failed, falling back to localStorage');
        }
      }

      // Priority 2: LocalStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(prev => ({
            ...prev,
            ...parsed
          }));
        } catch (e) {
          console.error('Error loading persisted data:', e);
        }
      }
    };

    loadData();
  }, []);

  // Handle outside click for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load and Sync Customers
  useEffect(() => {
    const loadCustomers = async () => {
      if (supabase) {
        try {
          const { data: cloudCustomers, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');
          
          if (cloudCustomers && !error) {
            setCustomers(cloudCustomers);
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(cloudCustomers));
            return;
          }
        } catch (e) {
          console.warn('Failed to load customers from cloud');
        }
      }

      const saved = localStorage.getItem(CUSTOMERS_KEY);
      if (saved) {
        try {
          setCustomers(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading customers from localStorage');
        }
      }
    };
    loadCustomers();
  }, []);

  const saveCustomer = async (cust: Omit<Customer, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newCust = { ...cust, id: tempId };
    
    // Optimistic update
    const updatedCustomers = [...customers, newCust].sort((a, b) => a.name.localeCompare(b.name));
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));

    if (supabase) {
      try {
        const { data: saved, error } = await supabase
          .from('customers')
          .insert([cust])
          .select()
          .single();
        
        if (saved && !error) {
          setCustomers(prev => prev.map(c => c.id === tempId ? saved : c));
        }
      } catch (e) {
        console.error('Failed to sync customer to cloud');
      }
    }
  };

  const deleteCustomer = async (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete customer from cloud');
      }
    }
  };

  const selectCustomer = (cust: Customer) => {
    setData(prev => ({
      ...prev,
      customerName: cust.name,
      customerAddress: cust.address,
      customerPhone: cust.phone
    }));
    setShowCustomerList(false);
  };

  // Save business data when it changes
  useEffect(() => {
    const businessData = {
      companyName: data.companyName,
      companySlogan: data.companySlogan,
      companyAddress: data.companyAddress,
      companyPhone: data.companyPhone,
      companyWhatsapp: data.companyWhatsapp,
      companyEmail: data.companyEmail,
      companyFacebook: data.companyFacebook,
      companyWebsite: data.companyWebsite,
      companyLogo: data.companyLogo,
    };

    // Save to LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(businessData));

    // Sync to Supabase (Upsert)
    const syncToCloud = async () => {
      if (!supabase) return;
      
      try {
        const { error } = await supabase
          .from('business_settings')
          .upsert({ 
            id: 1, 
            company_name: data.companyName,
            company_slogan: data.companySlogan,
            company_address: data.companyAddress,
            company_phone: data.companyPhone,
            company_whatsapp: data.companyWhatsapp,
            company_email: data.companyEmail,
            company_facebook: data.companyFacebook,
            company_website: data.companyWebsite,
            company_logo: data.companyLogo,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          const errorMsg = error.message.toLowerCase();
          const isMissingColumn = errorMsg.includes('column') && errorMsg.includes('not found');
          const isMissingTable = errorMsg.includes('relation') && errorMsg.includes('does not exist');
          const isCacheError = errorMsg.includes('schema cache');
          
          if (isMissingTable || isMissingColumn || isCacheError) {
            console.warn(`⚠️ Supabase Sync Issue: ${error.message}. Please ensure the SQL in /supabase_setup.sql is executed.`);
          } else {
            console.error('Cloud sync error:', error.message);
          }
        }
      } catch (e) {
        console.error('Failed to sync with Supabase');
      }
    };

    // Debounce cloud sync slightly to avoid hitting limits
    const timer = setTimeout(syncToCloud, 2000);
    return () => clearTimeout(timer);
  }, [
    data.companyName, 
    data.companySlogan, 
    data.companyAddress, 
    data.companyPhone, 
    data.companyWhatsapp, 
    data.companyEmail, 
    data.companyFacebook, 
    data.companyWebsite, 
    data.companyLogo
  ]);

  const validate = () => {
    const newErrors: typeof errors = {};
    const val = data.invoiceNumber.trim();
    if (!val) {
      newErrors.invoiceNumber = 'Invoice Number is required';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(val)) {
      newErrors.invoiceNumber = 'Use only letters, numbers, - or _';
    } else if (val.length < 3) {
      newErrors.invoiceNumber = 'Identifier too short (min 3 chars)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const totals = useMemo(() => {
    const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const tax = subtotal * 0.05; // 5% tax example
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }, [data.items]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      price: 0,
      qty: 1
    };
    setData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id: string) => {
    if (data.items.length === 1) return;
    setData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

  const handlePrint = () => {
    if (!validate()) return;
    setShowPrintConfirm(false);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!validate()) return;
    if (!invoiceRef.current) return;
    
    setIsExporting(true);
    
    const element = invoiceRef.current;
    const opt = {
      margin: 0,
      filename: `${data.invoiceNumber || 'Invoice'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center">
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showPrintConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-neutral-200"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 mx-auto">
                <Printer size={32} />
              </div>
              <h3 className="text-xl font-black text-center mb-2">Ready to print?</h3>
              <p className="text-neutral-500 text-center text-sm mb-8 leading-relaxed">
                Please ensure all details are correct. The invoice will be generated in A4 format.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPrintConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-50 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex-1 py-3 text-sm font-black bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Yes, Print Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header / Nav (No Print) */}
      <header className="w-full bg-white border-b border-neutral-200 py-4 px-6 fixed top-0 z-50 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SwiftInvoice</h1>
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-medium">Pro Generator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'customers' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <User size={16} />
            Customers
          </button>

          <button 
            onClick={() => setViewMode(prev => prev === 'preview' ? 'edit' : 'preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'edit' || viewMode === 'customers'
                ? 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                : 'bg-neutral-900 text-white shadow-lg'
            }`}
          >
            <ArrowLeftRight size={16} />
            {viewMode === 'preview' ? 'Back to Edit' : 'Preview Live'}
          </button>
          
          <button 
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-700 rounded-full text-sm font-black hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            <FileDown size={18} />
            {isExporting ? 'Saving...' : 'Save as PDF'}
          </button>

          <button 
            onClick={() => setShowPrintConfirm(true)}
            disabled={isPrinting}
            className={`flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all relative overflow-hidden ${
              isPrinting ? 'opacity-90 grayscale-[0.2]' : 'animate-pulse-subtle'
            }`}
          >
            {isPrinting ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing...
              </motion.div>
            ) : (
              <>
                <Printer size={18} />
                Print Invoice
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mt-24 mb-12 w-full max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Customers View */}
        {viewMode === 'customers' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-12 space-y-8 no-print"
          >
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-neutral-100 max-w-4xl mx-auto">
              <h2 className="text-2xl font-black mb-6">Customer Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Name</label>
                  <input 
                    type="text"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Phone</label>
                  <input 
                    type="text"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm"
                    placeholder="+880..."
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button 
                    onClick={() => {
                      if (newCustomer.name) {
                        saveCustomer(newCustomer);
                        setNewCustomer({ name: '', address: '', phone: '' });
                      }
                    }}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Add Customer
                  </button>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Address</label>
                  <textarea 
                    value={newCustomer.address}
                    onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm min-h-[60px]"
                    placeholder="123 Street, City"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {customers.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <User size={48} className="mx-auto mb-4 opacity-10" />
                    <p>No customers saved yet.</p>
                  </div>
                ) : (
                  customers.map(cust => (
                    <div key={cust.id} className="flex justify-between items-center p-4 bg-white border border-neutral-100 rounded-2xl hover:border-primary/30 transition-all group shadow-sm">
                      <div>
                        <h4 className="font-bold text-neutral-900">{cust.name}</h4>
                        <div className="flex gap-4 text-xs text-neutral-500 mt-1">
                          <span className="flex items-center gap-1"><Phone size={12} /> {cust.phone || 'N/A'}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {cust.address || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => selectCustomer(cust)}
                          className="px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/10"
                        >
                          Use in Invoice
                        </button>
                        <button 
                          onClick={() => deleteCustomer(cust.id)}
                          className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Input Form (No Print) */}
        <AnimatePresence mode="wait">
          {viewMode === 'edit' && (
            <motion.div 
              variants={{
                hidden: { opacity: 0, x: -20 },
                show: {
                  opacity: 1,
                  x: 0,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6 no-print"
            >
              <motion.section 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200"
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                  <Building2 size={14} /> Business Details
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Business Name</label>
                      <input 
                        type="text" 
                        value={data.companyName}
                        onChange={e => setData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        placeholder="My Company"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Slogan</label>
                      <input 
                        type="text" 
                        value={data.companySlogan}
                        onChange={e => setData(prev => ({ ...prev, companySlogan: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        placeholder="Our Slogan"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={data.companyWhatsapp}
                        onChange={e => setData(prev => ({ ...prev, companyWhatsapp: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Email</label>
                      <input 
                        type="text" 
                        value={data.companyEmail}
                        onChange={e => setData(prev => ({ ...prev, companyEmail: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Facebook</label>
                      <input 
                        type="text" 
                        value={data.companyFacebook}
                        onChange={e => setData(prev => ({ ...prev, companyFacebook: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Website</label>
                      <input 
                        type="text" 
                        value={data.companyWebsite}
                        onChange={e => setData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Upload Logo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Business Address (Footer)</label>
                    <textarea 
                      value={data.companyAddress}
                      onChange={e => setData(prev => ({ ...prev, companyAddress: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              </motion.section>

              <motion.section 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <User size={14} /> Customer Details
                  </h2>
                  <div className="relative" ref={customerSearchRef}>
                    <button 
                      onClick={() => setShowCustomerList(!showCustomerList)}
                      className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      Browse Saved
                    </button>
                    <AnimatePresence>
                      {showCustomerList && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-[60] py-2 overflow-hidden"
                        >
                          <div className="px-3 pb-2 border-b border-neutral-50 mb-2">
                             <input 
                               type="text" 
                               placeholder="Search customers..."
                               className="w-full px-3 py-1.5 bg-neutral-50 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30"
                               autoFocus
                               onChange={(e) => {
                                 const val = e.target.value.toLowerCase();
                                 setSearchResults(customers.filter(c => 
                                   c.name.toLowerCase().includes(val) || 
                                   c.phone.toLowerCase().includes(val)
                                 ));
                               }}
                             />
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {(searchResults.length > 0 ? searchResults : customers).map(cust => (
                              <button 
                                key={cust.id}
                                onClick={() => selectCustomer(cust)}
                                className="w-full px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors flex flex-col"
                              >
                                <span className="text-xs font-bold text-neutral-900">{cust.name}</span>
                                <span className="text-[10px] text-neutral-400">{cust.phone}</span>
                              </button>
                            ))}
                            {customers.length === 0 && (
                              <div className="px-4 py-4 text-center text-[10px] text-neutral-400">
                                No saved customers
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Company / Name</label>
                    <input 
                      type="text" 
                      value={data.customerName}
                      onChange={e => setData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                      placeholder="Customer Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Address</label>
                    <textarea 
                      value={data.customerAddress}
                      onChange={e => setData(prev => ({ ...prev, customerAddress: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm min-h-[80px]"
                      placeholder="Address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Phone</label>
                      <input 
                        type="text" 
                        value={data.customerPhone}
                        onChange={e => setData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1 flex flex-col">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Payment Status</label>
                      <button 
                        onClick={() => setData(prev => ({ ...prev, isPaid: !prev.isPaid }))}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          data.isPaid 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {data.isPaid ? <CheckCircle2 size={16} /> : null}
                        {data.isPaid ? 'PAID' : 'UNPAID'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>

              <motion.section 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <Hash size={14} /> Invoice Items
                  </h2>
                  <button 
                    onClick={addItem}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {data.items.map((item) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
                        className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 overflow-hidden"
                      >
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none text-xs"
                            placeholder="Description"
                          />
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 overflow-hidden">
                            <span className="text-[10px] text-neutral-400 font-bold">$</span>
                            <input 
                              type="number" 
                              value={item.price}
                              onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 py-2 outline-none text-xs"
                              placeholder="Price"
                            />
                          </div>
                          <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 overflow-hidden">
                            <span className="text-[10px] text-neutral-400 font-bold">Qty</span>
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                              className="w-full px-1 py-2 outline-none text-xs"
                              placeholder="1"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>

              <motion.section 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200"
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                  <Calendar size={14} /> Timeline & Details
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Invoice #</label>
                    <input 
                      type="text" 
                      value={data.invoiceNumber}
                      onChange={e => {
                        setData(prev => ({ ...prev, invoiceNumber: e.target.value }));
                        if (errors.invoiceNumber) setErrors(prev => ({ ...prev, invoiceNumber: undefined }));
                      }}
                      className={`w-full px-4 py-2.5 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-colors ${
                        errors.invoiceNumber ? 'border-red-500 bg-red-50' : 'border-neutral-200'
                      }`}
                      placeholder="INV-001"
                    />
                    {errors.invoiceNumber && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] text-red-500 font-bold ml-1"
                      >
                        {errors.invoiceNumber}
                      </motion.p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Date</label>
                    <input 
                      type="date" 
                      value={data.date}
                      onChange={e => setData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Notes / Terms</label>
                  <textarea 
                    value={data.notes}
                    onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm min-h-[60px]"
                  />
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`${viewMode === 'preview' ? 'lg:col-span-12' : 'lg:col-span-7'} transition-all duration-500 w-full flex justify-center`}>
          <div ref={invoiceRef} className={`invoice-container w-full bg-white rounded-sm max-w-[210mm] min-h-[297mm] p-12 md:p-14 flex flex-col font-sans relative overflow-hidden text-black transition-all ${
            isExporting ? 'shadow-none' : 'shadow-2xl'
          }`}>
            
            {/* Header: Logo, Name, Slogan & Title, Date */}
            <div className="flex justify-between items-start mb-4 relative pb-4">
              <div className="flex items-center gap-5">
                <div className={`w-24 h-24 rounded-full bg-black border-[6px] border-[#C5A059] flex flex-col items-center justify-center text-white relative overflow-hidden transition-all ${
                  isExporting ? 'shadow-none' : 'shadow-lg'
                }`}>
                  {data.companyLogo ? (
                    <img src={data.companyLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <span className="text-4xl font-black italic tracking-tighter leading-none">HZ</span>
                      <div className="h-[2px] w-12 bg-[#C5A059] my-1" />
                      <span className="text-[6px] font-bold uppercase tracking-widest text-[#C5A059]">Infinity Tech Zone</span>
                    </>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight leading-tight">{data.companyName}</h1>
                  <p className="text-sm font-bold text-black opacity-80">{data.companySlogan}</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-between items-end h-24">
                <h2 className="text-4xl font-black tracking-tight">INVOICE</h2>
                <div className="text-lg font-bold">
                  Date: {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-neutral-300 mb-6" />

            {/* Info Section: Customer & Contacts */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest bg-black text-white inline-block px-2 py-0.5">Invoice To :</p>
                <div className="space-y-1">
                  <p className="text-2xl font-black">{data.customerName}</p>
                  <p className="text-lg font-bold">{data.customerPhone}</p>
                  <p className="text-lg font-bold">{data.customerAddress}</p>
                </div>
              </div>

              <div className="space-y-3 flex flex-col items-end">
                <div className="space-y-3 w-fit">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                      <MessageSquare size={18} />
                    </div>
                    <span className="text-sm font-bold">{data.companyWhatsapp}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                      <Mail size={18} />
                    </div>
                    <span className="text-sm font-bold">{data.companyEmail}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                      <Facebook size={18} />
                    </div>
                    <span className="text-lg font-bold">{data.companyFacebook}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                      <Globe size={18} />
                    </div>
                    <span className="text-sm font-bold">{data.companyWebsite}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F37321] text-white">
                    <th className="py-2.5 px-4 text-left text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">No.</th>
                    <th className="py-2.5 px-4 text-left text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Description</th>
                    <th className="py-2.5 px-4 text-right text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Price</th>
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Qty</th>
                    <th className="py-2.5 px-4 text-right text-xs font-black uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  <AnimatePresence initial={false}>
                    {data.items.map((item, index) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td className="py-6 px-4 text-sm font-black text-center">{index + 1}</td>
                        <td className="py-6 px-4 text-sm font-bold">{item.description}</td>
                        <td className="py-6 px-4 text-right text-sm font-black">{item.price.toLocaleString()}</td>
                        <td className="py-6 px-4 text-center text-sm font-black">{item.qty}</td>
                        <td className="py-6 px-4 text-right text-sm font-black">{ (item.price * item.qty).toLocaleString() }</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              <div className="flex justify-end pt-4">
                <motion.div 
                  key={totals.total}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className={`bg-[#F37321] text-white px-8 py-2 rounded-sm flex gap-6 items-center transition-all ${
                    isExporting ? 'shadow-none' : 'shadow-lg'
                  }`}
                >
                  <span className="text-lg font-black uppercase tracking-widest">Total :</span>
                  <span className="text-xl font-black">{totals.total.toLocaleString()}</span>
                </motion.div>
              </div>
            </div>

            {/* Middle Section: Invoice No & Stamp */}
            <div className="mt-8 flex justify-between items-start">
              <div>
                <p className="text-lg font-black uppercase tracking-wider">INV NO; {data.invoiceNumber}</p>
              </div>
              {data.isPaid && (
                <motion.div 
                  initial={{ scale: 2, opacity: 0, rotate: 10, filter: 'blur(10px)' }}
                  animate={{ scale: 1, opacity: 1, rotate: -12, filter: 'blur(0px)' }}
                  transition={{ 
                    type: 'spring', 
                    damping: 12, 
                    stiffness: 150,
                    opacity: { duration: 0.1 }
                  }}
                  className="relative pointer-events-none select-none print:opacity-100"
                >
                  <div className="relative group">
                    {/* Inner Content Component for a cleaner SVG look */}
                    <svg width="140" height="140" viewBox="0 0 140 140" className={isExporting ? '' : 'drop-shadow-sm'}>
                      {/* Outer Distressed Ring */}
                      <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500/30" />
                      <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500/80" />
                      
                      {/* Top Arched Text */}
                      <path id="curve" d="M 30,70 A 40,40 0 0,1 110,70" fill="transparent" />
                      <text className="text-[7.5px] font-black uppercase tracking-[0.2em] fill-red-500/60">
                        <textPath href="#curve" startOffset="50%" textAnchor="middle">
                          Authentified Payment
                        </textPath>
                      </text>

                      {/* Main PAID Text */}
                      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" className="text-4xl font-black fill-red-500 tracking-tighter">
                        PAID
                      </text>

                      {/* Divider Line */}
                      <rect x="35" y="75" width="70" height="1.5" className="fill-red-500/20" />

                      {/* Bottom Footer Text */}
                      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" className="text-[8px] font-black fill-red-600/90 uppercase tracking-widest">
                        Infinity Tech
                      </text>
                      
                      {/* Date/Ref Stamp (Dynamic-ish looking) */}
                      <text x="50%" y="100%" dominantBaseline="middle" textAnchor="middle" className="text-[6px] font-bold fill-red-400 uppercase">
                        Ref: {data.invoiceNumber || 'TX-99'}
                      </text>
                    </svg>

                    {/* Subtle "glow" or ink bleed effect */}
                    {!isExporting && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="absolute inset-0 bg-red-400/20 blur-xl rounded-full"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Terms */}
            <div className="mt-8">
              <h4 className="text-sm font-black uppercase mb-3 tracking-wider">Terms and Conditions</h4>
              <p className="text-[11px] font-bold leading-relaxed opacity-80">
                {data.notes}
              </p>
            </div>

            {/* Signature Area */}
            <div className="mt-16 flex justify-end">
              <div className="text-center">
                 <div className="w-48 h-px bg-neutral-400 mb-2" />
                 <p className="text-sm font-black uppercase tracking-widest">Signature</p>
              </div>
            </div>

            {/* Bottom Banner */}
            <footer className="mt-auto -mx-14 -mb-14 overflow-hidden relative h-24 flex items-center justify-center bg-black">
              <div className="absolute inset-0 bg-[#F37321] skew-x-[-15deg] transform scale-110 -mx-6 h-full flex items-center justify-center">
                 <div className="skew-x-[15deg] flex items-center gap-4 text-black px-12">
                    <div className="bg-black text-[#F37321] p-2.5 rounded-full">
                       <MapPin size={24} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-tight text-center max-w-sm">
                      {data.companyAddress}
                    </p>
                 </div>
              </div>
            </footer>
          </div>
        </div>
      </main>

      {/* Quick Action (Fixed Mobile) */}
      <div className="fixed bottom-6 right-6 no-print lg:hidden flex flex-col gap-2">
         <button 
           onClick={handlePrint}
           className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
         >
           <Printer size={24} />
         </button>
      </div>

      <style>{`
        @media screen and (max-width: 1024px) {
          .invoice-container {
            transform: scale(calc(var(--zoom-factor, 1)));
            transform-origin: top center;
          }
        }
      `}</style>
    </div>
  );
}
