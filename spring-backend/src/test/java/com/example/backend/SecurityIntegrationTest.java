package com.example.backend;

import com.example.backend.model.LoginRequest;
import com.example.backend.model.LoginResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class SecurityIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void loginShouldReturnCookieAndAllowAccess() {
        String baseUrl = "http://localhost:" + port + "/api";

        // 1. Login
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("admin");
        loginRequest.setPassword("admin123");

        ResponseEntity<LoginResponse> loginResponse = restTemplate.postForEntity(
                baseUrl + "/login", loginRequest, LoginResponse.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        List<String> cookies = loginResponse.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotEmpty();
        System.out.println("Cookies received: " + cookies);

        // 2. Extract JSESSIONID
        String jsessionid = cookies.stream()
                .filter(c -> c.startsWith("JSESSIONID"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("JSESSIONID cookie not found"));

        // 3. Access Protected Endpoint (/api/me)
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, jsessionid);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<String> meResponse = restTemplate.exchange(
                baseUrl + "/me", HttpMethod.GET, requestEntity, String.class);

        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    public void unauthenticatedAccessShouldFail() {
        String baseUrl = "http://localhost:" + port + "/api";

        ResponseEntity<String> unauthResponse = restTemplate
                .getForEntity(baseUrl + "/me", String.class);

        // Expect 403 Forbidden (or 401)
        assertThat(unauthResponse.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    public void adminUseCreateUserShouldSuccess() {
        String baseUrl = "http://localhost:" + port + "/api";

        // Admin login
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("admin");
        loginRequest.setPassword("admin123");

        ResponseEntity<LoginResponse> loginResponse = restTemplate.postForEntity(
                baseUrl + "/login",
                loginRequest,
                LoginResponse.class);

        String jsessionid = loginResponse.getHeaders().get(HttpHeaders.SET_COOKIE).get(0);

        // Create new user payload
        String createUserJson = "{" +
                "\"username\": \"testuser\"," +
                "\"password\": \"password\"," +
                "\"role\": {\"name\": \"STAFF\"}" +
                "}";

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, jsessionid);
        headers.add(HttpHeaders.CONTENT_TYPE, "application/json");
        HttpEntity<String> requestEntity = new HttpEntity<>(createUserJson, headers);

        ResponseEntity<String> userResponse = restTemplate.postForEntity(
                baseUrl + "/users", requestEntity, String.class);

        assertThat(userResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // Test removed: adminCanCreateNewRole - Roles are now static.
}
