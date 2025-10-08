package com.example.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;

@SpringBootApplication
public class SpringBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpringBackendApplication.class, args);
    }

    // Initialize Roles & Users, mock early data only
    @Bean
    CommandLineRunner init(RoleRepository roleRepo, UserRepository userRepo) {
        return args -> {
            if (roleRepo.count() == 0) {
                Role admin = new Role(); admin.setName("ADMIN"); roleRepo.save(admin);
                Role manager = new Role(); manager.setName("MANAGER"); roleRepo.save(manager);
                Role staff = new Role(); staff.setName("STAFF"); roleRepo.save(staff);

                User u1 = new User(); u1.setUsername("admin"); u1.setPassword("admin123"); u1.setRole(admin); userRepo.save(u1);
                User u2 = new User(); u2.setUsername("manager"); u2.setPassword("manager123"); u2.setRole(manager); userRepo.save(u2);
                User u3 = new User(); u3.setUsername("staff"); u3.setPassword("staff123"); u3.setRole(staff); userRepo.save(u3);
            }
        };
    }
}
