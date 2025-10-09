package com.medverse.backend.controller.admin;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medverse.backend.BaseIntegrationTest;
import com.medverse.backend.entity.Role;
import com.medverse.backend.payload.rbac.RoleCreateRequest;
import com.medverse.backend.payload.rbac.UpdateRolePermissionsRequest;
import com.medverse.backend.repository.RoleRepository;

@AutoConfigureMockMvc
@Transactional
class RbacControllerIT extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    void getAllRoles_FailsWhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/v1/admin/rbac/roles"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "USER_PROFILE:READ_OWN")
    void getAllRoles_FailsWhenNotAuthorized() throws Exception {
        mockMvc.perform(get("/v1/admin/rbac/roles"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "RBAC:MANAGE")
    void getAllRoles_SuccessWhenAuthorized() throws Exception {
        mockMvc.perform(get("/v1/admin/rbac/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[?(@.code == 'ADMIN')].permissions[?(@.code == 'RBAC:MANAGE')]").exists());
    }

    @Test
    @WithMockUser(authorities = "RBAC:MANAGE")
    void createRole_Success() throws Exception {
        RoleCreateRequest request = new RoleCreateRequest("TEST_ROLE", "Test Role", "A role for integration testing");

        mockMvc.perform(post("/v1/admin/rbac/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("TEST_ROLE"))
                .andExpect(jsonPath("$.data.name").value("Test Role"));
    }

    @Test
    @WithMockUser(authorities = "RBAC:MANAGE")
    void updateRolePermissions_Success() throws Exception {
        var receptionistRole = roleRepository.findByCode("RECEPTIONIST").orElseThrow();
        UUID roleId = receptionistRole.getId();

        UpdateRolePermissionsRequest request = new UpdateRolePermissionsRequest(Set.of("APPOINTMENT:READ_ANY"));

        mockMvc.perform(put("/v1/admin/rbac/roles/" + roleId + "/permissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissions", hasSize(1)))
                .andExpect(jsonPath("$.data.permissions[0].code", is("APPOINTMENT:READ_ANY")));
    }

    @Test
    @WithMockUser(authorities = "RBAC:MANAGE")
    void deleteRole_Success() throws Exception {
        Role newRole = new Role();
        newRole.setCode("TO_BE_DELETED");
        newRole.setName("Role to be deleted");
        var savedRole = roleRepository.save(newRole);
        UUID roleId = savedRole.getId();

        mockMvc.perform(delete("/v1/admin/rbac/roles/" + roleId))
                .andExpect(status().isNoContent());
    }
}
