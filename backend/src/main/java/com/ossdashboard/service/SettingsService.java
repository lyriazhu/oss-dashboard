package com.ossdashboard.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Holds runtime settings (e.g. GitHub token) that users can supply via the UI.
 * The token from the environment variable is the fallback; a token set via the
 * API takes precedence for the lifetime of the process.
 */
@Service
public class SettingsService {

    @Value("${app.github.token:}")
    private String envToken;

    private String runtimeToken;

    /** Returns the effective token: UI-supplied first, then env var fallback. */
    public String getGithubToken() {
        if (runtimeToken != null && !runtimeToken.isBlank()) return runtimeToken;
        if (envToken     != null && !envToken.isBlank())     return envToken;
        return null;
    }

    public void setGithubToken(String token) {
        this.runtimeToken = token;
    }

    public boolean hasGithubToken() {
        return getGithubToken() != null;
    }
}
