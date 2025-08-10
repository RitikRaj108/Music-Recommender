package com.project.recommender_pro.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public")
public class publicController {

    @GetMapping("/test")
    public String testPublicEndpoint() {
        return "Public endpoint is working!";
    }
}
