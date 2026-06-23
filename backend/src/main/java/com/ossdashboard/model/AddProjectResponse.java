package com.ossdashboard.model;

/**
 * Response DTO for adding a new project
 */
public class AddProjectResponse {
    private boolean success;
    private String message;
    private Project project;
    private String extractionStatus;

    public AddProjectResponse() {
    }

    public AddProjectResponse(boolean success, String message, Project project, String extractionStatus) {
        this.success = success;
        this.message = message;
        this.project = project;
        this.extractionStatus = extractionStatus;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public String getExtractionStatus() {
        return extractionStatus;
    }

    public void setExtractionStatus(String extractionStatus) {
        this.extractionStatus = extractionStatus;
    }
}

// Made with Bob