package com.ossdashboard.controller;

import com.ossdashboard.service.SettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST API for runtime settings (GitHub token, etc.)
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /**
     * GET /api/settings/github-token/status
     * Returns whether a GitHub token is currently configured.
     */
    @GetMapping("/github-token/status")
    public ResponseEntity<Map<String, Boolean>> getTokenStatus() {
        return ResponseEntity.ok(Map.of("configured", settingsService.hasGithubToken()));
    }

    /**
     * POST /api/settings/github-token
     * Body: { "token": "ghp_..." }
     * Stores the token in memory for the lifetime of this process.
     */
    @PostMapping("/github-token")
    public ResponseEntity<Map<String, String>> setToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "token must not be empty"));
        }
        settingsService.setGithubToken(token.strip());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

// Made with Bob
