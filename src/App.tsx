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
  MessageCircle,
  MessageSquare,
  Building2,
  Calendar,
  Hash,
  User,
  MapPin,
  CheckCircle2,
  ArrowLeftRight,
  FileDown,
  Search,
  ShieldCheck,
  ShieldAlert,
  History,
  Clock,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore - html2pdf.js doesn't have standard types
import html2pdf from 'html2pdf.js';

interface InvoiceItem {
  id: string;
  description: string;
  price: number;
  qty: number;
  warranty?: string;
  serialNumber?: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface InvoiceData {
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'customers' | 'verify' | 'history'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [verifySerial, setVerifySerial] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showFilenameModal, setShowFilenameModal] = useState(false);
  const [pdfFilename, setPdfFilename] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', phone: '' });
  const [errors, setErrors] = useState<{ general?: string }>({});
  const invoiceRef = useRef<HTMLDivElement>(null);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Persistence Key
  const STORAGE_KEY = 'swift_invoice_business_data';
  const CUSTOMERS_KEY = 'swift_invoice_customers';
  const DRAFT_KEY = 'swift_invoice_draft';

  const [hasDraft, setHasDraft] = useState(false);

  // Load persisted business data and drafts on mount
  useEffect(() => {
    const checkDraft = () => {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          // Only show restore if draft is different from current data and has some content
          if (parsed.customerName !== INITIAL_DATA.customerName || parsed.items.length > 1) {
            setHasDraft(true);
          }
        } catch (e) {}
      }
    };
    
    const loadData = async () => {
      checkDraft();
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

  const verifyProductBySerial = async (serial: string) => {
    if (!serial.trim() || !supabase) return;
    
    try {
      const { data: results, error } = await supabase
        .from('invoices')
        .select('*');
      
      if (results && !error) {
        // Search inside JSONB items
        const match = results.find(inv => 
          inv.items.some((item: any) => item.serialNumber?.toLowerCase().includes(serial.toLowerCase()))
        );
        
        if (match) {
          const item = match.items.find((i: any) => i.serialNumber?.toLowerCase().includes(serial.toLowerCase()));
          setVerifyResult({ ...match, matchedItem: item });
        } else {
          setVerifyResult('NOT_FOUND');
        }
      }
    } catch (e) {
      console.error('Verification failed');
    }
  };

  const saveInvoiceToCloud = async () => {
    if (!supabase) return;
    try {
      await supabase.from('invoices').insert([{
        customer_name: data.customerName,
        items: data.items,
        total_amount: totals.total,
        full_data: data
      }]);
    } catch (e) {
      console.error('Invoice sync failed');
    }
  };

  const fetchHistory = async () => {
    if (!supabase) return;
    setIsFetchingHistory(true);
    try {
      const { data: results, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (results && !error) {
        setHistory(results);
      }
    } catch (e) {
      console.error('Failed to fetch history');
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // If it's a simple date string (YYYY-MM-DD), parse it as local time to avoid TZ shifts
      if (dateStr.length === 10 && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric'
        });
      }
      
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const loadFromHistory = (record: any) => {
    if (record.full_data) {
      setData(record.full_data);
      setViewMode('edit');
      // Clear draft since we just loaded a specific history item
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  };

  const handleRestoreDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        setData(JSON.parse(draft));
        setHasDraft(false);
      } catch (e) {
        console.error('Failed to restore draft');
      }
    }
  };

  const deleteFromHistory = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (!error) {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete history item');
    }
  };

  // Auto-save draft whenever anything changes (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }, 1000);
    return () => clearTimeout(timer);
  }, [data]);

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
    return true;
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
    
    // Add dynamic print styles for perfect A4 page fit
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4; margin: 0; }
        body { margin: 0; border: none; background: white; }
        .no-print { display: none !important; }
        .invoice-container { 
          width: 210mm !important; 
          height: 297mm !important; 
          min-height: 297mm !important;
          margin: 0 !important; 
          padding: 15mm !important; 
          box-shadow: none !important; 
          border: none !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 0 !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    setViewMode('preview');
    saveInvoiceToCloud();
    
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    
    setTimeout(() => {
      window.print();
      document.head.removeChild(style);
    }, 700);
  };

  const initiateDownloadPDF = () => {
    if (!validate()) return;
    setPdfFilename(data.customerName || 'Invoice');
    setShowFilenameModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setShowFilenameModal(false);
    
    setIsExporting(true);
    await saveInvoiceToCloud();
    
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    
    // Slight delay to allow DOM to normalize (remove shadows/etc)
    setTimeout(async () => {
      const element = invoiceRef.current;
      if (!element) return;

      const opt = {
        margin: 0,
        filename: `${pdfFilename.trim() || 'Invoice'}.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      try {
        await html2pdf().set(opt).from(element).save();
      } catch (error) {
        console.error('PDF generation error:', error);
      } finally {
        setIsExporting(false);
      }
    }, 500);
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

        {showFilenameModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-neutral-200"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Download size={32} />
              </div>
              <h3 className="text-xl font-black text-center mb-2">Save as PDF</h3>
              <p className="text-neutral-500 text-center text-sm mb-6 leading-relaxed">
                Enter a custom name for your invoice file.
              </p>
              
              <div className="mb-8">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1 mb-1 block">File Name</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    value={pdfFilename}
                    onChange={e => setPdfFilename(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDownloadPDF()}
                    placeholder="Enter filename..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold transition-all"
                  />
                  <div className="absolute right-4 top-1/3 text-neutral-400 text-xs font-bold">.pdf</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFilenameModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-50 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex-1 py-3 text-sm font-black bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Save PDF
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
            onClick={() => {
              setViewMode('history');
              fetchHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'history' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <History size={16} />
            History
          </button>

          <button 
            onClick={() => setViewMode('verify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'verify' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <ShieldCheck size={16} />
            Verify
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
            onClick={initiateDownloadPDF}
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

      <main className="mt-24 mb-12 w-full max-w-7xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mx-auto place-items-center">
        {/* History View */}
        {viewMode === 'history' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-12 space-y-8 no-print"
          >
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-neutral-100 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black">Invoice History</h2>
                  <p className="text-neutral-500 text-sm">View and restore previous invoices.</p>
                </div>
                <button 
                  onClick={fetchHistory}
                  disabled={isFetchingHistory}
                  className="p-2 text-neutral-400 hover:text-primary transition-colors hover:bg-neutral-50 rounded-full"
                  title="Refresh"
                >
                  <motion.div animate={isFetchingHistory ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RotateCw size={18} />
                  </motion.div>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="px-4 py-4 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Date</th>
                      <th className="px-4 py-4 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Customer</th>
                      <th className="px-4 py-4 text-right text-[10px] font-black uppercase text-neutral-400 tracking-widest">Amount</th>
                      <th className="px-4 py-4 text-center text-[10px] font-black uppercase text-neutral-400 tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && !isFetchingHistory ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-400">
                          <History size={48} className="mx-auto mb-4 opacity-10" />
                          <p>No history found.</p>
                        </td>
                      </tr>
                    ) : (
                      history.map((record) => (
                        <tr key={record.id} className="group border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-neutral-300" />
                              <span className="text-xs text-neutral-600 font-medium">{formatDate(record.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-neutral-600 font-medium">{record.customer_name}</td>
                          <td className="px-4 py-4 text-right font-black text-neutral-900 text-sm">
                            {(Number(record.total_amount) || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => loadFromHistory(record)}
                                className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-colors"
                              >
                                Restore
                              </button>
                              <button 
                                onClick={() => deleteFromHistory(record.id)}
                                className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Verify View */}
        {viewMode === 'verify' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-12 max-w-2xl mx-auto w-full no-print"
          >
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-neutral-100 font-sans">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black">Warranty Verification</h2>
                <p className="text-neutral-500 text-sm">Check authenticity & warranty status of a product.</p>
              </div>

              <div className="flex gap-2 p-2 bg-neutral-100 rounded-2xl mb-8">
                <input 
                  type="text"
                  value={verifySerial}
                  onChange={e => setVerifySerial(e.target.value)}
                  placeholder="Enter Serial Number..."
                  className="flex-1 bg-transparent px-4 py-3 outline-none font-bold"
                  onKeyDown={e => e.key === 'Enter' && verifyProductBySerial(verifySerial)}
                />
                <button 
                  onClick={() => verifyProductBySerial(verifySerial)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Search size={18} /> Verify
                </button>
              </div>

              {verifyResult === 'NOT_FOUND' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-red-50 rounded-2xl border border-red-100 text-center"
                >
                  <ShieldAlert className="mx-auto text-red-500 mb-2" size={32} />
                  <h3 className="font-black text-red-900">Not Found</h3>
                  <p className="text-red-700 text-xs">This serial number was never registered in our system.</p>
                </motion.div>
              )}

              {verifyResult && verifyResult !== 'NOT_FOUND' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-green-50 rounded-2xl border border-green-100"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-green-900 text-lg">Authentic Product</h3>
                      <p className="text-green-700 text-xs italic">Verified on {formatDate(verifyResult.created_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase">Product</p>
                        <p className="font-black text-green-900">{verifyResult.matchedItem?.description}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase">Customer</p>
                        <p className="font-black text-green-900">{verifyResult.customer_name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200">
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase">Serial Number</p>
                        <p className="font-mono text-green-900 font-bold">{verifyResult.matchedItem?.serialNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase">Warranty Info</p>
                        <p className="font-black text-green-900">{verifyResult.matchedItem?.warranty || 'No info'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
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
              {hasDraft && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/20 p-5 rounded-3xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary">Unsaved Draft Detected</p>
                      <p className="text-[10px] text-primary/60 font-medium">You have an invoice from a previous session.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        localStorage.removeItem(DRAFT_KEY);
                        setHasDraft(false);
                      }}
                      className="px-4 py-2 text-[10px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={handleRestoreDraft}
                      className="px-5 py-2 bg-primary text-white text-[10px] font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Restore Data
                    </button>
                  </div>
                </motion.div>
              )}
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
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1 flex items-center gap-1">
                        <MessageCircle size={10} className="text-[#25D366]" /> WhatsApp
                      </label>
                      <input 
                        type="text" 
                        value={data.companyWhatsapp}
                        onChange={e => setData(prev => ({ ...prev, companyWhatsapp: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1 flex items-center gap-1">
                        <Mail size={10} className="text-[#ea4335]" /> Email
                      </label>
                      <input 
                        type="text" 
                        value={data.companyEmail}
                        onChange={e => setData(prev => ({ ...prev, companyEmail: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ea4335]/20 focus:border-[#ea4335] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1 flex items-center gap-1">
                        <Facebook size={10} className="text-[#1877F2]" /> Facebook
                      </label>
                      <input 
                        type="text" 
                        value={data.companyFacebook}
                        onChange={e => setData(prev => ({ ...prev, companyFacebook: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1 flex items-center gap-1">
                        <Globe size={10} className="text-[#0ea5e9]" /> Website
                      </label>
                      <input 
                        type="text" 
                        value={data.companyWebsite}
                        onChange={e => setData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] outline-none"
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

                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            value={item.serialNumber || ''}
                            onChange={e => updateItem(item.id, 'serialNumber', e.target.value)}
                            className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg outline-none text-[10px] font-bold text-primary italic"
                            placeholder="Serial Number"
                          />
                          <input 
                            type="text" 
                            value={item.warranty || ''}
                            onChange={e => updateItem(item.id, 'warranty', e.target.value)}
                            className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg outline-none text-[10px] font-bold text-primary italic"
                            placeholder="Warranty Info"
                          />
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
                      <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Issue Date</label>
                      <input 
                        type="date" 
                        value={data.date}
                        onChange={e => setData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
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

        <div className={`${viewMode === 'preview' ? 'lg:col-span-12' : 'lg:col-span-12 xl:col-span-7'} transition-all duration-500 w-full flex justify-center`}>
          <div ref={invoiceRef} className={`invoice-container w-full bg-white rounded-none border border-neutral-100 max-w-[210mm] min-h-[297mm] p-12 md:p-14 flex flex-col font-sans relative overflow-hidden text-black transition-all ${
            isExporting ? 'shadow-none' : 'shadow-2xl'
          }`} style={{ width: '210mm', height: '297mm' }}>
            
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
                <div className="text-lg font-black text-black">
                  {formatDate(data.date)}
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-neutral-300 mb-6" />

            {/* Info Section: Customer & Contacts */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-3">
                <div className="bg-black text-white px-4 py-1 flex justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest">Invoice To :</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black">{data.customerName}</p>
                  <p className="text-lg font-bold">{data.customerPhone}</p>
                  <p className="text-lg font-bold">{data.customerAddress}</p>
                </div>
              </div>

              <div className="space-y-3 flex flex-col items-end">
                <div className="space-y-3 w-fit">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#25D366] flex items-center justify-center text-[#25D366] bg-[#25D366]/5">
                      <MessageCircle size={18} fill="currentColor" fillOpacity={0.1} />
                    </div>
                    <span className="text-sm font-bold text-neutral-800">{data.companyWhatsapp}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#ea4335] flex items-center justify-center text-[#ea4335] bg-[#ea4335]/5">
                      <Mail size={18} fill="currentColor" fillOpacity={0.1} />
                    </div>
                    <span className="text-sm font-bold text-neutral-800">{data.companyEmail}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#1877F2] flex items-center justify-center text-[#1877F2] bg-[#1877F2]/5">
                      <Facebook size={18} fill="currentColor" fillOpacity={0.1} />
                    </div>
                    <span className="text-lg font-bold text-neutral-800">{data.companyFacebook}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#0ea5e9] flex items-center justify-center text-[#0ea5e9] bg-[#0ea5e9]/5">
                      <Globe size={18} fill="currentColor" fillOpacity={0.1} />
                    </div>
                    <span className="text-sm font-bold text-neutral-800">{data.companyWebsite}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F37321] text-white">
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">No.</th>
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Description</th>
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Price</th>
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider border-r border-[#ffffff33]">Qty</th>
                    <th className="py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider">Subtotal</th>
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
                        <td className="py-6 px-4">
                          <p className="text-sm font-bold uppercase">{item.description}</p>
                          {(item.serialNumber || item.warranty) && (
                            <div className="mt-1.5 flex gap-4">
                              {item.serialNumber && (
                                <p className="text-[10px] font-black text-primary flex items-center gap-1">
                                  <Hash size={10} /> {item.serialNumber}
                                </p>
                              )}
                              {item.warranty && (
                                <p className="text-[10px] font-black text-neutral-500 border border-neutral-200 px-1.5 rounded flex items-center gap-1">
                                  <ShieldCheck size={10} /> {item.warranty}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
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
                  className={`bg-[#F37321] text-white px-8 py-3 rounded-md flex justify-center items-center gap-10 transition-all ${
                    isExporting ? 'shadow-none' : 'shadow-lg'
                  }`}
                >
                  <span className="text-lg font-black uppercase tracking-widest">Total :</span>
                  <span className="text-2xl font-black tracking-tight">{totals.total.toLocaleString()}</span>
                </motion.div>
              </div>
            </div>

            {/* Middle Section: Stamp */}
            <div className="mt-8 flex justify-end items-start">
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
                        {data.companyName}
                      </text>
                      
                      {/* Date/Ref Stamp (Dynamic-ish looking) */}
                      <text x="50%" y="100%" dominantBaseline="middle" textAnchor="middle" className="text-[6px] font-bold fill-red-400 uppercase">
                        DATE: {formatDate(data.date)}
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
