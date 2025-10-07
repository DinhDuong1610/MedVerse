package com.medverse.backend.controller.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.medverse.backend.BaseIntegrationTest;

@AutoConfigureMockMvc
class RbacControllerIT extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /v1/admin/rbac/roles: (Thất bại) - Nên trả về lỗi 401 Unauthorized khi không xác thực")
    void getAllRoles_FailsWhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/v1/admin/rbac/roles"))
                .andExpect(status().isUnauthorized());
    }
}
