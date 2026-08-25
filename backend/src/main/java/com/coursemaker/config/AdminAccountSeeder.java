package com.coursemaker.config;

import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.UserRole;
import com.coursemaker.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

/**
 * Ensures a fixed admin account exists with known credentials, so there is always a predictable
 * login for testing admin-only screens without a manual DB promotion + re-login. Runs on every
 * boot and re-syncs role and password each time, so the .env credentials always work even if the
 * account was previously changed by hand. Disabled unless both ADMIN_EMAIL and ADMIN_PASSWORD are
 * set - never set these on a shared or production environment, since the password sits in plain
 * text in .env and gets reset on every boot.
 */
@Slf4j
@Component
public class AdminAccountSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminAccountSeeder(UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               @Value("${app.admin.email:}") String adminEmail,
                               @Value("${app.admin.password:}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail == null ? "" : adminEmail.trim().toLowerCase();
        this.adminPassword = adminPassword == null ? "" : adminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isEmpty() || adminPassword.isEmpty()) {
            return;
        }

        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElseGet(() -> User.builder()
                .email(adminEmail)
                .name("Admin")
                .nickname("admin")
                .stacks(new ArrayList<>())
                .build());

        admin.setRole(UserRole.ADMIN);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        userRepository.save(admin);
        log.info("Fixed admin account ready: {}", adminEmail);
    }
}
