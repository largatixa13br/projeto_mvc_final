CREATE DATABASE IF NOT EXISTS emprestimos_equipamentos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emprestimos_equipamentos;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT NULL,
  patrimonio VARCHAR(80) NULL,
  categoria_id INT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('DISPONIVEL','EMPRESTADO','MANUTENCAO') NOT NULL DEFAULT 'DISPONIVEL',
  quantidade_total INT NOT NULL DEFAULT 1,
  quantidade_disponivel INT NOT NULL DEFAULT 1,
  localizacao VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equip_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipamento_imagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipamento_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mimetype VARCHAR(120) NOT NULL,
  tamanho INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_img_equip
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emprestimos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  equipamento_id INT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  nome_solicitante VARCHAR(160) NULL,
  celular VARCHAR(40) NULL,
  data_retirada DATE NULL,
  data_emprestimo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_prevista_devolucao DATE NULL,
  data_devolucao DATETIME NULL,
  status ENUM('ABERTO','DEVOLVIDO','ATRASADO','CANCELADO') NOT NULL DEFAULT 'ABERTO',
  observacao VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_emp_equip
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_emp_usuario ON emprestimos(usuario_id);
CREATE INDEX idx_emp_equip ON emprestimos(equipamento_id);
CREATE INDEX idx_emp_status ON emprestimos(status);

INSERT IGNORE INTO categorias (id, nome) VALUES (1, 'Informática'), (2, 'Audiovisual'), (3, 'Ferramentas');

-- Usuário admin padrão
INSERT IGNORE INTO usuarios (id, nome, email, senha_hash, perfil, ativo)
VALUES (1, 'Administrador', 'admin@local', '$2b$10$XPL2NNwBhT1SpN0ojrGrdeLEcrWF1MIPWsx0QBDkznFzl.x902Kwy', 'ADMIN', 1);
