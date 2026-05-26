-- treatment_prices: 병원별 시술 가격 테이블
CREATE TABLE IF NOT EXISTS treatment_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  treatment_name text NOT NULL UNIQUE,
  price_1 integer NOT NULL DEFAULT 0,
  price_3 integer NOT NULL DEFAULT 0,
  price_5 integer NOT NULL DEFAULT 0,
  price_10 integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treatment_prices_read" ON treatment_prices FOR SELECT USING (true);
CREATE POLICY "treatment_prices_insert" ON treatment_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "treatment_prices_update" ON treatment_prices FOR UPDATE USING (true);

-- hospital_photos: 병원 업로드 사진 테이블
CREATE TABLE IF NOT EXISTS hospital_photos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospital_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital_photos_select" ON hospital_photos FOR SELECT USING (true);
CREATE POLICY "hospital_photos_insert" ON hospital_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "hospital_photos_delete" ON hospital_photos FOR DELETE USING (true);

-- hospital_auth: 병원 로그인 테이블
CREATE TABLE IF NOT EXISTS hospital_auth (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hospital_name text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospital_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital_auth_select" ON hospital_auth FOR SELECT USING (true);

-- 기본 병원 계정 (비밀번호: nosil2024)
-- password_hash는 실제 배포 시 bcrypt 등으로 교체 필요
INSERT INTO hospital_auth (hospital_name, password_hash) VALUES
  ('노실장 병원', 'nosil2024')
ON CONFLICT (hospital_name) DO NOTHING;
