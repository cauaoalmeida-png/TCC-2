-- ============================================
-- FactoryTrack — Script de criação do banco
-- Rode este arquivo no phpMyAdmin (XAMPP) ou via
-- `mysql -u root -p < db.sql` antes de iniciar o server.js
-- ============================================

CREATE DATABASE IF NOT EXISTS factorytrack_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE factorytrack_db;

-- ---------- SETORES ----------
CREATE TABLE IF NOT EXISTS setores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_setor VARCHAR(100) NOT NULL,
  responsavel VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- USUÁRIOS (login) ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  usuario VARCHAR(100),
  senha VARCHAR(255) NOT NULL,
  cargo VARCHAR(50),
  tipo VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_usuarios_usuario (usuario)
);

-- ---------- MÁQUINAS ----------
CREATE TABLE IF NOT EXISTS maquinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_maquina VARCHAR(100) NOT NULL,
  setor_associado VARCHAR(100) NOT NULL,
  numero_serie VARCHAR(50),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- OCORRÊNCIAS (registro livre + checklists) ----------
CREATE TABLE IF NOT EXISTS ocorrencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  data DATETIME NOT NULL,
  setor VARCHAR(100) NOT NULL,
  maquina VARCHAR(100) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  operador VARCHAR(100) NOT NULL,
  turno VARCHAR(50) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
  resolucao TEXT,
  itensChecklist TEXT,          -- JSON serializado (itens marcados no checklist)
  dataResolucao DATETIME NULL,  -- preenchida quando a ocorrência é resolvida
  CONSTRAINT fk_ocorrencia_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
);

-- ---------- ESTOQUE (peças) ----------
CREATE TABLE IF NOT EXISTS pecas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(50),
  qtd INT NOT NULL DEFAULT 0,
  min INT NOT NULL DEFAULT 0,
  unidade VARCHAR(20)
);

-- ---------- GUINDASTES E ALUGUÉIS ----------
CREATE TABLE IF NOT EXISTS guindastes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modelo VARCHAR(100) NOT NULL,
  identificacao VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'Disponível'
);

CREATE TABLE IF NOT EXISTS alugueis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guindaste_id INT NOT NULL,
  cliente VARCHAR(150) NOT NULL,
  data_locacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_prevista_devolucao DATE NOT NULL,
  data_devolucao_real DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Ativo',
  CONSTRAINT fk_aluguel_guindaste
    FOREIGN KEY (guindaste_id) REFERENCES guindastes(id)
    ON DELETE RESTRICT
);

-- ============================================
-- Dados iniciais (opcional) — mesmos dados fictícios
-- que o front-end usava no localStorage (js/data.js),
-- para a demonstração ficar consistente.
-- ============================================
INSERT INTO setores (nome_setor, responsavel) VALUES
  ('Montagem', 'Carlos Silva'),
  ('Qualidade', 'Ana Paula'),
  ('Expedição', 'Roberto Melo'),
  ('Manutenção', 'José Ferreira');

INSERT INTO maquinas (nome_maquina, setor_associado, numero_serie) VALUES
  ('Esteira Linha A', 'Montagem', 'EST-001'),
  ('Parafusadeira Automática', 'Montagem', 'PAF-002'),
  ('Mesa de Inspeção Visual', 'Qualidade', 'INS-003'),
  ('Calibrador Digital', 'Qualidade', 'CAL-004'),
  ('Empilhadeira Elétrica', 'Expedição', 'EMP-005'),
  ('Balança Industrial', 'Expedição', 'BAL-006'),
  ('Compressor de Ar', 'Manutenção', 'CMP-007');

INSERT INTO pecas (nome, categoria, qtd, min, unidade) VALUES
  ('Parafuso M6', 'Fixação', 500, 100, 'un'),
  ('Correia Esteira A', 'Peça de máquina', 3, 2, 'un'),
  ('Óleo Lubrificante', 'Insumo', 12, 5, 'l'),
  ('Filtro de Ar Compressor', 'Manutenção', 1, 2, 'un');
