package com.medverse.backend.payload.staff;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class ReceptionistProfileRequest {
    @Schema(description = "Unique employee ID for the receptionist", example = "RECEP001")
    private String employeeId;
}
