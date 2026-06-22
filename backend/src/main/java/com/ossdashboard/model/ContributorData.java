package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Contributor data for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContributorData {
    @JsonProperty("total_contributors")
    private Integer totalContributors;
    
    private List<Contributor> contributors;
    private Map<String, Integer> companies;
    
    @JsonProperty("total_companies")
    private Integer totalCompanies;
    
    @JsonProperty("extracted_at")
    private String extractedAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Contributor {
        private String login;
        private String name;
        private String company;
        private String location;
        private String email;
        private Integer contributions;
        
        @JsonProperty("profile_url")
        private String profileUrl;
    }
}

// Made with Bob
