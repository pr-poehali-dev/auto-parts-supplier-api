CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_url VARCHAR(500) NOT NULL,
  api_key_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  name VARCHAR(500) NOT NULL,
  article VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  manufacturer VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(supplier_id, article)
);

CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

INSERT INTO suppliers (name, api_url, api_key_name, is_active) VALUES
  ('ПартнёрАвто', 'https://api.partneravto.ru/v1/products', 'PARTNERAVTO_API_KEY', true),
  ('АвтоЗапчасти.РФ', 'https://api.avtozapchasti.rf/catalog', 'AVTOZAPCHASTI_API_KEY', true);

INSERT INTO products (supplier_id, name, article, category, price, in_stock, quantity, image_url, manufacturer) VALUES
  (1, 'Тормозные колодки передние', 'BRK-2341-F', 'Тормозная система', 2500.00, true, 15, '/placeholder.svg', 'Brembo'),
  (1, 'Масляный фильтр двигателя', 'FLT-8923-OIL', 'Двигатель', 450.00, true, 42, '/placeholder.svg', 'Mann Filter'),
  (1, 'Амортизатор передний левый', 'SUS-1122-FL', 'Подвеска', 4800.00, true, 8, '/placeholder.svg', 'Bilstein'),
  (2, 'Свечи зажигания (комплект 4шт)', 'SPK-5544-SET', 'Двигатель', 1200.00, true, 24, '/placeholder.svg', 'NGK'),
  (2, 'Тормозной диск передний', 'DSK-3367-F', 'Тормозная система', 3200.00, false, 0, '/placeholder.svg', 'ATE'),
  (2, 'Воздушный фильтр двигателя', 'AIR-7788-ENG', 'Двигатель', 650.00, true, 35, '/placeholder.svg', 'Bosch'),
  (1, 'Стартер 12V', 'STR-4421-12V', 'Электрика', 8500.00, true, 5, '/placeholder.svg', 'Valeo'),
  (1, 'Генератор 90A', 'GEN-9876-90A', 'Электрика', 12000.00, true, 3, '/placeholder.svg', 'Bosch'),
  (2, 'Радиатор охлаждения', 'RAD-5533-COOL', 'Двигатель', 6700.00, true, 7, '/placeholder.svg', 'Nissens'),
  (2, 'Лампа H7 (комплект 2шт)', 'LMP-H7-SET', 'Электрика', 890.00, true, 50, '/placeholder.svg', 'Philips');
