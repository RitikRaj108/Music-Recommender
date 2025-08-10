package com.project.recommender_pro.controllers;

import com.project.recommender_pro.dto.UserDTO;
import com.project.recommender_pro.model.User;
import com.project.recommender_pro.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/users")
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }


    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody UserDTO userDTO) {
        User user = new User();
        user.setClerkId(userDTO.getClerkId());
        user.setEmail(userDTO.getEmail());
        user.setUsername(userDTO.getUsername());

        User savedUser = userService.saveUser(user);
        return ResponseEntity.ok(savedUser);
    }

}
