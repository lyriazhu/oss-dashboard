package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Release data for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReleaseData {
    @JsonProperty("total_releases")
    private Integer totalReleases;
    
    @JsonProperty("recent_releases")
    private List<Release> recentReleases;
    
    @JsonProperty("extracted_at")
    private String extractedAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Release {
        @JsonProperty("tag_name")
        private String tagName;
        
        private String name;
        
        @JsonProperty("published_at")
        private String publishedAt;
        
        private Boolean prerelease;
        private Boolean draft;
    }
}

// Made with Bob
