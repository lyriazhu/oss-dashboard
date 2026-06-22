package com.ossdashboard.controller;

import com.ossdashboard.model.*;
import com.ossdashboard.service.DataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * REST API controller for project data
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Slf4j
public class ProjectController {

    private final DataService dataService;

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
}

// Made with Bob
