package com.example.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableAsync
public class SpringBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringBackendApplication.class, args);
    }

    @Bean
    CommandLineRunner init(RoleRepository roleRepo,
                           UserRepository userRepo,
                           PasswordEncoder passwordEncoder) {
        return args -> {

            // Create roles if not exist
            Role adminRole = roleRepo.findByName("ADMIN").orElse(null);
            if (adminRole == null) {
                adminRole = new Role();
                adminRole.setName("ADMIN");
                roleRepo.save(adminRole);
            }

            Role managerRole = roleRepo.findByName("MANAGER").orElse(null);
            if (managerRole == null) {
                managerRole = new Role();
                managerRole.setName("MANAGER");
                roleRepo.save(managerRole);
            }

            Role staffRole = roleRepo.findByName("STAFF").orElse(null);
            if (staffRole == null) {
                staffRole = new Role();
                staffRole.setName("STAFF");
                roleRepo.save(staffRole);
            }

            // Create users if not exist
            if (userRepo.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(adminRole);
                userRepo.save(admin);
            }

            if (userRepo.findByUsername("manager").isEmpty()) {
                User manager = new User();
                manager.setUsername("manager");
                manager.setPassword(passwordEncoder.encode("manager123"));
                manager.setRole(managerRole);
                userRepo.save(manager);
            }

            if (userRepo.findByUsername("staff").isEmpty()) {
                User staff = new User();
                staff.setUsername("staff");
                staff.setPassword(passwordEncoder.encode("staff123"));
                staff.setRole(staffRole);
                userRepo.save(staff);
            }

            System.out.println("Default roles and users initialized.");
        };
    }
}