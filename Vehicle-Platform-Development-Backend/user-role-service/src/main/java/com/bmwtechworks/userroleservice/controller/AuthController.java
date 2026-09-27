package com.bmwtechworks.userroleservice.controller;

import com.bmwtechworks.userroleservice.dto.LoginRequest;
import com.bmwtechworks.userroleservice.dto.LoginResponse;
import com.bmwtechworks.userroleservice.model.User;
import com.bmwtechworks.userroleservice.service.JwtService;
import com.bmwtechworks.userroleservice.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(
            UserService userService,
            JwtService jwtService
    ) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request
    ) {

        User user = userService.login(
                request.email(),
                request.password()
        );

        String token = jwtService.generateToken(
                user.getId(),
                user.getEmail()
        );

        return new LoginResponse(
                "Login successful",
                token
        );
    }
}