package com.medverse.backend.payload.inventory;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class StockImportRequest {

    @NotNull(message = "Medication ID is required")
    private UUID medicationId;

    @NotNull(message = "Batch number is required")
    private String batchNumber;

    private String supplierName;

    private LocalDate manufactureDate;

    @NotNull(message = "Expiry date is required")
    @Future(message = "Expiry date must be in the future")
    private LocalDate expiryDate;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private Integer quantity;

    @NotNull(message = "Import price is required")
    @Min(value = 0, message = "Import price cannot be negative")
    private BigDecimal importPrice;

    @NotNull(message = "Sale price is required")
    @Min(value = 0, message = "Sale price cannot be negative")
    private BigDecimal salePrice;

    private String importReferenceCode;
}