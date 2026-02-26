-- Create accountants table
CREATE TABLE IF NOT EXISTS accountants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'PF', -- PF or PJ
    document VARCHAR(20), -- CPF or CNPJ
    crc_number VARCHAR(50),
    crc_uf VARCHAR(2),
    crc_sequence VARCHAR(50),
    crc_date DATE,
    qualification VARCHAR(100), -- Título Profissional
    
    -- Address
    zip_code VARCHAR(10),
    address VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Contact
    phone VARCHAR(20),
    fax VARCHAR(20),
    cellphone VARCHAR(20),
    email VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
