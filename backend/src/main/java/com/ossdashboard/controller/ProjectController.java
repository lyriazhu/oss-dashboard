package com.ossdashboard.controller;

import com.ossdashboard.model.*;
import com.ossdashboard.service.DataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * REST API controller for project data
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private static final Logger log = LoggerFactory.getLogger(ProjectController.class);
    private final DataService dataService;

    public ProjectController(DataService dataService) {
        this.dataService = dataService;
    }

    /**
     * GET /api/projects
     * Get all projects
     */
    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        try {
            log.info("Fetching all projects");
            List<Project> projects = dataService.getAllProjects();
            return ResponseEntity.ok(projects);
        } catch (IOException e) {
            log.error("Error fetching projects", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/projects/{projectId}
     * Get a specific project
     */
    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProject(@PathVariable String projectId) {
        try {
            log.info("Fetching project: {}", projectId);
            Project project = dataService.getProjectById(projectId);
            
            if (project == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(project);
        } catch (IOException e) {
            log.error("Error fetching project: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/projects/{projectId}/metrics
     * Get complete metrics for a project
     */
    @GetMapping("/{projectId}/metrics")
    public ResponseEntity<ProjectMetrics> getProjectMetrics(@PathVariable String projectId) {
        try {
            log.info("Fetching metrics for project: {}", projectId);
            ProjectMetrics metrics = dataService.getProjectMetrics(projectId);
            
            if (metrics == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(metrics);
        } catch (IOException e) {
            log.error("Error fetching metrics for project: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/projects/{projectId}/metadata
     * Get metadata for a project
     */
    @GetMapping("/{projectId}/metadata")
    public ResponseEntity<ProjectMetadata> getProjectMetadata(@PathVariable String projectId) {
        try {
            log.info("Fetching metadata for project: {}", projectId);
            ProjectMetadata metadata = dataService.getProjectMetadata(projectId);
            
            if (metadata == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(metadata);
        } catch (IOException e) {
            log.error("Error fetching metadata for project: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/projects/{projectId}/contributors
     * Get contributors for a project
     */
    @GetMapping("/{projectId}/contributors")
    public ResponseEntity<ContributorData> getProjectContributors(@PathVariable String projectId) {
        try {
            log.info("Fetching contributors for project: {}", projectId);
            ContributorData contributors = dataService.getProjectContributors(projectId);
            
            if (contributors == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(contributors);
        } catch (IOException e) {
            log.error("Error fetching contributors for project: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/projects
     * Add a new project and trigger data extraction
     */
    @PostMapping
    public ResponseEntity<AddProjectResponse> addProject(@RequestBody AddProjectRequest request) {
        try {
            log.info("Adding new project from GitHub URL: {}", request.getGithubUrl());
            
            // Validate GitHub URL
            String[] parts = dataService.parseGithubUrl(request.getGithubUrl());
            if (parts == null) {
                AddProjectResponse response = new AddProjectResponse(
                    false,
                    "Invalid GitHub URL format. Expected: https://github.com/owner/repo",
                    null,
                    null
                );
                return ResponseEntity.badRequest().body(response);
            }

            // Add project to projects.json
            Project newProject = dataService.addProject(request);
            
            // Trigger data extraction asynchronously
            String extractionStatus;
            try {
                dataService.triggerDataExtraction(newProject.getId());
                extractionStatus = "Data extraction started. This may take several minutes.";
            } catch (IllegalStateException e) {
                // No GitHub token — tell the user clearly
                log.warn("Cannot start extraction for {}: {}", newProject.getId(), e.getMessage());
                extractionStatus = "Project added but no GitHub token is set. Enter your token via the settings icon in the toolbar, then re-add the project.";
            } catch (Exception e) {
                log.warn("Failed to trigger data extraction: {}", e.getMessage());
                extractionStatus = "Project added but data extraction failed to start. Run manually: cd scripts && python3 extract_single_project.py " + newProject.getId();
            }

            AddProjectResponse response = new AddProjectResponse(
                true,
                "Project added successfully",
                newProject,
                extractionStatus
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            log.error("Invalid request: {}", e.getMessage());
            AddProjectResponse response = new AddProjectResponse(
                false,
                e.getMessage(),
                null,
                null
            );
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            log.error("Error adding project", e);
            AddProjectResponse response = new AddProjectResponse(
                false,
                "Internal server error: " + e.getMessage(),
                null,
                null
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    /**
     * DELETE /api/projects/{projectId}
     * Remove a project from projects.json, config.yaml, and its data directory.
     */
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> removeProject(@PathVariable String projectId) {
        try {
            log.info("Removing project: {}", projectId);
            dataService.removeProject(projectId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Remove project failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Error removing project: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/projects/{projectId}/extraction-progress
     * Server-Sent Events stream of extraction log lines.
     * Polls the in-memory log buffer and sends new lines until __DONE__ or __FAILED__.
     */
    @GetMapping(value = "/{projectId}/extraction-progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter extractionProgress(@PathVariable String projectId) {
        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10-minute timeout

        Executors.newSingleThreadExecutor().submit(() -> {
            int sent = 0;
            try {
                while (true) {
                    List<String> lines = dataService.getExtractionLogs(projectId);
                    while (sent < lines.size()) {
                        String line = lines.get(sent++);
                        emitter.send(SseEmitter.event().data(line));
                        if ("__DONE__".equals(line) || "__FAILED__".equals(line)) {
                            emitter.complete();
                            return;
                        }
                    }
                    // If extraction finished and we've sent all lines, close
                    if (!dataService.isExtractionRunning(projectId) && sent >= lines.size()) {
                        emitter.send(SseEmitter.event().data("__DONE__"));
                        emitter.complete();
                        return;
                    }
                    Thread.sleep(300);
                }
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}

// Made with Bob
