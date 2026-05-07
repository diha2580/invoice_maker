-- UPGRADED SQL SETUP (Run this in Supabase SQL Editor)
-- This ensures all columns are using snake_case to match the app's sync logic.

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS business_settings (
    id BIGINT PRIMARY KEY,
    company_name TEXT,
    company_slogan TEXT,
    company_address TEXT,
    company_phone TEXT,
    company_whatsapp TEXT,
    company_email TEXT,
    company_facebook TEXT,
    company_website TEXT,
    company_logo TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fix naming issues (optional, only needed if you have an old version of the table)
-- You can also just delete the table and re-run step 1: DROP TABLE business_settings;
DO $$ 
BEGIN
    -- Fix companyName -> company_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyName') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyName" TO company_name;
    END IF;
    
    -- Fix companySlogan -> company_slogan
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companySlogan') THEN
        ALTER TABLE business_settings RENAME COLUMN "companySlogan" TO company_slogan;
    END IF;

    -- Fix companyAddress -> company_address
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyAddress') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyAddress" TO company_address;
    END IF;

    -- Fix companyPhone -> company_phone
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyPhone') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyPhone" TO company_phone;
    END IF;

    -- Fix companyWhatsapp -> company_whatsapp
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyWhatsapp') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyWhatsapp" TO company_whatsapp;
    END IF;

    -- Fix companyEmail -> company_email
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyEmail') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyEmail" TO company_email;
    END IF;

    -- Fix companyFacebook -> company_facebook
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyFacebook') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyFacebook" TO company_facebook;
    END IF;

    -- Fix companyWebsite -> company_website
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyWebsite') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyWebsite" TO company_website;
    END IF;

    -- Fix companyLogo -> company_logo
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='companyLogo') THEN
        ALTER TABLE business_settings RENAME COLUMN "companyLogo" TO company_logo;
    END IF;

    -- Ensure company_email exists if totally missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='company_email') THEN
        ALTER TABLE business_settings ADD COLUMN company_email TEXT;
    END IF;
END $$;

-- 3. Permissions
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON business_settings;
CREATE POLICY "Public Access" ON business_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Customers" ON customers;
CREATE POLICY "Public Access Customers" ON customers FOR ALL USING (true) WITH CHECK (true);
