ALTER TABLE encounters
ADD COLUMN history_of_present_illness TEXT, -- Quá trình bệnh lý
ADD COLUMN past_medical_history TEXT,       -- Tiền sử bản thân
ADD COLUMN family_history TEXT,             -- Tiền sử gia đình
ADD COLUMN physical_exam_note TEXT,         -- Khám lâm sàng (Toàn thân + Cơ quan)
ADD COLUMN treatment_plan TEXT,             -- Hướng điều trị
ADD COLUMN prognosis TEXT,                  -- Tiên lượng
ADD COLUMN subclinical_tests_note TEXT;     -- Cận lâm sàng đề nghị