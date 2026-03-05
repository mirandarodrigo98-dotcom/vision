
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS department_permissions (
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (department_id, permission_code)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Insert default departments if not exist
INSERT INTO departments (name, description) VALUES 
('Cliente', 'Departamento para usuários externos (clientes)'),
('Operador', 'Departamento padrão para operadores internos'),
('Admin', 'Departamento administrativo')
ON CONFLICT (name) DO NOTHING;
