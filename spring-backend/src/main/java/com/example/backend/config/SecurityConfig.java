package com.example.backend.config;

import com.example.backend.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    public SecurityConfig(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth

                        // Preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public login & logout
                        .requestMatchers(HttpMethod.POST, "/api/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/login/verify-2fa").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/logout").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users/register-request").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/maker-checker/requests").permitAll()

                        // ADMIN endpoints
                        .requestMatchers("/api/users/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/roles/**")
                        .hasRole("ADMIN")

                        // ✅ PENDING REQUESTS (FIXED)
                        .requestMatchers("/api/pending/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // Accounts
                        .requestMatchers("/api/accounts/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // Customers
                        .requestMatchers("/api/customers/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // Dashboard
                        .requestMatchers("/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // AI Chat
                        .requestMatchers("/api/chat/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // User Profile (any authenticated user)
                        .requestMatchers("/api/profile/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        // Everything else must be authenticated
                        .anyRequest().authenticated()
                )

                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository())
                        .requireExplicitSave(false)
                )

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )

                .userDetailsService(userDetailsService);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET","POST","PUT","DELETE","OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}