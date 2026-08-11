package com.coursemaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CourseMakerApplication {

    public static void main(String[] args) {
        SpringApplication.run(CourseMakerApplication.class, args);
    }
}
