package com.medverse.backend.service.inventory;

import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.entity.inventory.MedicationBatch;
import com.medverse.backend.entity.inventory.StockTransaction;
import com.medverse.backend.mapper.InventoryMapper;
import com.medverse.backend.payload.inventory.MedicationCreateRequest;
import com.medverse.backend.payload.inventory.MedicationDto;
import com.medverse.backend.payload.inventory.StockImportRequest;
import com.medverse.backend.repository.MedicationBatchRepository;
import com.medverse.backend.repository.MedicationRepository;
import com.medverse.backend.repository.StockTransactionRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.StockTransactionType;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final MedicationRepository medicationRepository;
    private final MedicationBatchRepository batchRepository;
    private final StockTransactionRepository transactionRepository;
    private final InventoryMapper inventoryMapper;
    private final AuditService auditService;

    @Transactional
    public MedicationDto createMedication(MedicationCreateRequest request) {
        if (medicationRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Medication", "code", request.getCode());
        }

        Medication medication = inventoryMapper.toEntity(request);
        Medication saved = medicationRepository.save(medication);

        // auditService.record("CREATE_MEDICATION", "MEDICATION",
        // saved.getId().toString(), "Created: " + saved.getName());
        return inventoryMapper.toDto(saved);
    }

    public Page<MedicationDto> getMedications(String keyword, Pageable pageable) {
        Page<Medication> page;
        if (keyword != null && !keyword.isBlank()) {
            page = medicationRepository.search(keyword, pageable);
        } else {
            page = medicationRepository.findAll(pageable);
        }

        return page.map(med -> {
            MedicationDto dto = inventoryMapper.toDto(med);
            Integer totalStock = batchRepository.sumAvailableQuantity(med.getId(), LocalDate.now());
            dto.setTotalStock(totalStock);
            return dto;
        });
    }

    public MedicationDto getMedicationById(UUID id) {
        Medication med = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
        MedicationDto dto = inventoryMapper.toDto(med);
        dto.setTotalStock(batchRepository.sumAvailableQuantity(med.getId(), LocalDate.now()));
        return dto;
    }

    @Transactional
    public void importStock(StockImportRequest request) {
        log.info("Importing stock for medication ID: {}", request.getMedicationId());

        Medication medication = medicationRepository.findById(request.getMedicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", request.getMedicationId()));

        MedicationBatch probe = new MedicationBatch();
        probe.setMedication(medication);
        probe.setBatchNumber(request.getBatchNumber());
        probe.setExpiryDate(request.getExpiryDate());

        MedicationBatch batch = batchRepository.findOne(Example.of(probe))
                .orElseGet(() -> {
                    return MedicationBatch.builder()
                            .medication(medication)
                            .batchNumber(request.getBatchNumber())
                            .expiryDate(request.getExpiryDate())
                            .manufactureDate(request.getManufactureDate())
                            .supplierName(request.getSupplierName())
                            .initialQuantity(0)
                            .currentQuantity(0)
                            .importPrice(request.getImportPrice())
                            .salePrice(request.getSalePrice())
                            .build();
                });

        batch.setImportPrice(request.getImportPrice());
        batch.setSalePrice(request.getSalePrice());

        batch.setInitialQuantity(batch.getInitialQuantity() + request.getQuantity());
        batch.setCurrentQuantity(batch.getCurrentQuantity() + request.getQuantity());

        MedicationBatch savedBatch = batchRepository.save(batch);

        StockTransaction transaction = StockTransaction.builder()
                .batch(savedBatch)
                .type(StockTransactionType.IMPORT)
                .quantity(request.getQuantity())
                .balanceAfter(savedBatch.getCurrentQuantity())
                .referenceCode(request.getImportReferenceCode())
                .reason("Import stock")
                .build();

        transactionRepository.save(transaction);

        // auditService.record("IMPORT_STOCK", "MEDICATION_BATCH",
        // savedBatch.getId().toString(),
        // "Imported " + request.getQuantity() + " items of " + medication.getName());
    }
}