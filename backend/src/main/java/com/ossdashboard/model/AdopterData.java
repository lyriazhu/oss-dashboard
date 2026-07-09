package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Adopter data parsed from a project's ADOPTERS.md
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AdopterData {

    @JsonProperty("total_adopters")
    public Integer totalAdopters;

    public List<Adopter> adopters;

    public String source;

    @JsonProperty("extracted_at")
    public String extractedAt;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Adopter {
        public String name;
        public String type;
        public String description;
        public String since;
        public String url;
    }
}

// Made with Bob
