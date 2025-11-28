package com.medverse.backend.config;

import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.entity.inventory.MedicationBatch;
import com.medverse.backend.entity.inventory.StockTransaction;
import com.medverse.backend.repository.MedicationBatchRepository;
import com.medverse.backend.repository.MedicationRepository;
import com.medverse.backend.repository.StockTransactionRepository;
import com.medverse.backend.utils.enumeration.StockTransactionType;
import com.opencsv.CSVParser;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.exceptions.CsvValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class MedicationSeeder implements CommandLineRunner {

    private final MedicationRepository medicationRepository;
    private final MedicationBatchRepository batchRepository;
    private final StockTransactionRepository transactionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedMedications();
    }

    private void seedMedications() {
        if (medicationRepository.count() > 0) {
            log.info("Medications already exist. Skipping seeding.");
            return;
        }

        log.info("Starting medication seeding from CSV...");

        try (var reader = new InputStreamReader(new ClassPathResource("data/medications.csv").getInputStream(),
                StandardCharsets.UTF_8)) {

            // Cấu hình để đọc file phân cách bằng Tab (\t) vì file gốc của bạn có vẻ là TSV
            // Nếu file là CSV thường (phân cách bằng phẩy), hãy đổi separator thành ','
            CSVParser parser = new CSVParserBuilder()
                    .withSeparator(',')
                    .withIgnoreQuotations(true)
                    .build();

            try (CSVReader csvReader = new CSVReaderBuilder(reader)
                    .withSkipLines(1) // Bỏ qua header
                    .withCSVParser(parser)
                    .build()) {

                String[] line;
                int count = 0;

                while ((line = csvReader.readNext()) != null) {
                    // Safe check: Bỏ qua dòng trống hoặc quá ngắn
                    if (line.length < 3)
                        continue;

                    // Mapping columns based on your CSV structure:
                    // 0: STT, 1: Tên chung (Generic), 2: ATC, 3: Loại, 4: Dạng/Hàm lượng, 5: Biệt
                    // dược, 6: Chống chỉ định, 7: Tương tác

                    try {
                        String genericName = safeGet(line, 1);
                        String atcCode = safeGet(line, 2);
                        // String type = safeGet(line, 3);
                        String packingSpec = safeGet(line, 4); // Dạng thuốc & Hàm lượng
                        String contraindication = safeGet(line, 6);

                        // Xử lý Unit (Lấy từ chữ đầu tiên của Dạng thuốc, VD: "Viên nén" -> "Viên")
                        String unit = extractUnit(packingSpec);

                        // 1. Tạo Medication
                        Medication medication = Medication.builder()
                                .name(genericName) // Dùng tên chung quốc tế làm tên chính
                                .activeIngredient(genericName)
                                .code("MED-" + atcCode + "-" + count) // Tạo mã unique
                                .atcCode(atcCode)
                                .unit(unit)
                                .packingSpecification(packingSpec)
                                .usageInstruction("Theo chỉ định của bác sĩ.")
                                .contraindication(contraindication)
                                .build();

                        Medication savedMed = medicationRepository.save(medication);

                        // 2. Tạo Batch (Nhập kho luôn)
                        createInitialBatch(savedMed);
                    } catch (Exception e) {
                        log.error("Failed to process line: {}. Error: {}", String.join(",", line), e.getMessage());
                        continue;
                    }

                    count++;
                    if (count % 100 == 0) {
                        log.info("Seeded {} medications...", count);
                    }
                }
                log.info("Successfully seeded {} medications and batches.", count);
            }
        } catch (IOException | CsvValidationException e) {
            log.error("Failed to seed medications: {}", e.getMessage());
        }
    }

    // Helper method để lấy dữ liệu an toàn, tránh ArrayIndexOutOfBoundsException
    private String safeGet(String[] line, int index) {
        if (line != null && index < line.length && line[index] != null) {
            return line[index].trim();
        }
        return "";
    }

    private void createInitialBatch(Medication medication) {
        MedicationBatch batch = MedicationBatch.builder()
                .medication(medication)
                .batchNumber("INIT-" + LocalDate.now().getYear()) // Lô khởi tạo
                .supplierName("MedVerse Default Supplier")
                .manufactureDate(LocalDate.now().minusMonths(1))
                .expiryDate(LocalDate.now().plusYears(3)) // Hạn dùng 3 năm
                .initialQuantity(10000)
                .currentQuantity(10000) // Tồn kho lớn để test thoải mái
                .importPrice(new BigDecimal("5000")) // Giá giả định
                .salePrice(new BigDecimal("8000")) // Giá bán giả định
                .build();

        MedicationBatch savedBatch = batchRepository.save(batch);

        // Ghi log nhập kho ảo
        StockTransaction transaction = StockTransaction.builder()
                .batch(savedBatch)
                .type(StockTransactionType.IMPORT)
                .quantity(10000)
                .balanceAfter(10000)
                .referenceCode("SEEDING_INIT")
                .reason("Initial data seeding")
                .build();

        transactionRepository.save(transaction);
    }

    private String extractUnit(String packingSpec) {
        if (packingSpec == null || packingSpec.isEmpty())
            return "Đơn vị";
        // Lấy từ đầu tiên làm đơn vị (VD: "Viên nén..." -> "Viên")
        String[] parts = packingSpec.split(" ");
        if (parts.length > 0) {
            String firstWord = parts[0].trim().replace(",", "");
            // Chuẩn hóa một số đơn vị phổ biến
            if (firstWord.equalsIgnoreCase("Viên"))
                return "Viên";
            if (firstWord.equalsIgnoreCase("Thuốc"))
                return "Ống"; // Thường thuốc tiêm
            if (firstWord.equalsIgnoreCase("Dung"))
                return "Chai"; // Dung dịch
            return firstWord;
        }
        return "Đơn vị";
    }
}